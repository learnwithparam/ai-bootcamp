import { afterAll, beforeAll, expect, test } from "bun:test";
import { stripe } from "@bootcamp/stripe";
import { checkPage } from "@bootcamp/ui/check-page";
import { eq, inArray, or, sql } from "drizzle-orm";
import { type Browser, chromium, type Page } from "playwright";
import { myPlan } from "../agent/tools/my-plan";
import { makeMember, payingCustomer } from "../db/member";
import { accountByEmail, addToSupportTeam, db, recordTurn } from "../db/queries";
import { conversations, members, supportTeam, turns } from "../db/schema";
import { readLimits } from "../rules/limits";
import { ask, openMessenger, signUp, startServer, stopServer, URL } from "./browser";

// Each role's path in a real browser, against the real model and Stripe's test mode. A visitor asks and
// sees sources; a member opens billing; a guest is handed to the team, and a teammate answers in the inbox.

const BUSY_IP = "203.0.113.7";
const RUN = crypto.randomUUID().slice(0, 8);
const IP_HEADER = process.env.SITE_ASSISTANT_IP_HEADER as string;
let browser: Browser;
const customers: string[] = [];

beforeAll(async () => {
  await startServer();
  browser = await chromium.launch();
}, 90_000);

afterAll(async () => {
  const mine = sql`(select id from "user" where email like ${`%-${RUN}@example.com`})`;
  await db.delete(turns).where(eq(turns.visitor, `ip:${BUSY_IP}`));
  await db
    .delete(conversations)
    .where(or(inArray(conversations.visitor, guests), inArray(conversations.userId, mine)));
  await db.execute(sql`delete from ${members} where user_id in ${mine}`);
  await db.execute(sql`delete from ${supportTeam} where user_id in ${mine}`);
  await db.execute(sql`delete from "user" where id in ${mine}`);
  for (const customer of customers) await stripe().customers.del(customer);
  await browser?.close();
  stopServer();
}, 60_000);

// A guest is a random id in a cookie; the test keeps each one so it can remove that guest's conversation.
const guests: string[] = ["none"];
async function keepGuest(page: Page) {
  const cookie = (await page.context().cookies()).find((each) => each.name === "site_visitor");
  if (cookie) guests.push(`guest:${cookie.value}`);
}

const newPage = async () => (await browser.newContext()).newPage();

test("a visitor gets a cited answer and can open its sources", async () => {
  const page = await newPage();
  await page.goto(URL);
  await openMessenger(page);
  await page.getByRole("button", { name: "How much is Pro, and what does it add?" }).click();
  const sources = page.locator(".sources-fold summary");
  await sources.waitFor({ timeout: 60_000 });
  expect(await sources.textContent()).toMatch(/^\d+ sources?$/);
  await sources.click();
  expect(await page.locator(".source-chip").first().getAttribute("href")).toStartWith(
    "https://www.learnwithparam.com",
  );
  await keepGuest(page);
  await checkPage(page);
}, 90_000);

test("a visitor over the per-minute limit gets a 429 before any model call", async () => {
  const { perMinute } = readLimits(process.env);
  for (let question = 0; question < perMinute; question++) {
    await recordTurn({ visitor: `ip:${BUSY_IP}`, action: "answer", confidence: 1 });
  }
  const message = { id: "m1", role: "user", parts: [{ type: "text", text: "Hello" }] };
  const response = await fetch(`${URL}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json", [IP_HEADER]: BUSY_IP },
    body: JSON.stringify({ conversationId: crypto.randomUUID(), message, page: "/" }),
  });
  expect(response.status).toBe(429);
  expect(await response.text()).toContain("Wait a moment");
}, 30_000);

test("a signed-in member opens Stripe's billing portal in a new tab", async () => {
  const page = await newPage();
  const email = `member-${RUN}@example.com`;
  await signUp(page, email);
  customers.push((await makeMember(email)).customerId);
  await openMessenger(page);
  await ask(page, "I want to update the card I pay with.");
  const button = page.getByRole("link", { name: "Manage billing" });
  await button.waitFor({ timeout: 60_000 });
  expect(await button.getAttribute("target")).toBe("_blank");
  expect(await button.getAttribute("href")).toStartWith("https://billing.stripe.com/");
}, 120_000);

// Anyone can sign up with an email they do not own. A paying customer with that email in Stripe
// must stay out of reach: the plan belongs to the account that checked out, not to the email.
test("signing up with a paying customer's email does not reach their plan", async () => {
  const email = `customer-${RUN}@example.com`;
  customers.push(await payingCustomer(email));
  await signUp(await newPage(), email);
  const account = await accountByEmail(email);
  const plan = await myPlan(account?.id ?? null).execute?.(
    {},
    { toolCallId: "test", messages: [], context: {} },
  );
  expect(plan).toEqual({ signedIn: true, plan: null });
}, 60_000);

test("a refund goes to the team; a teammate takes it, replies and closes it in the inbox", async () => {
  const visitor = await newPage();
  await visitor.goto(URL);
  await openMessenger(visitor);
  await ask(visitor, `I bought Pro by mistake an hour ago. Please refund me. I am sam-${RUN}@example.com`);
  await visitor.getByText("Passed to the support team").waitFor({ timeout: 60_000 });
  await visitor.getByText("Replies in this conversation").waitFor();
  await keepGuest(visitor);

  const teammate = await newPage();
  const email = `teammate-${RUN}@example.com`;
  await signUp(teammate, email, "Ada Teammate");
  await addToSupportTeam((await accountByEmail(email))?.id as string);
  await teammate.goto(`${URL}/inbox`);
  await teammate.getByRole("link", { name: new RegExp(`sam-${RUN}@example.com`) }).click();
  await teammate.getByRole("button", { name: "Assign to me" }).click();
  await teammate.getByText("Assigned to Ada Teammate").waitFor();
  const reply = teammate.getByRole("textbox", { name: /Reply to/ });
  await reply.fill("   ");
  await teammate.getByRole("button", { name: "Send reply" }).click();
  await teammate.getByRole("alert").filter({ hasText: "Write a reply first." }).waitFor();
  await reply.fill("Hi Sam, the refund is on its way.");
  await teammate.getByRole("button", { name: "Send reply" }).click();
  await checkPage(teammate);

  // The teammate's reply is its own message under their name, never joined to the assistant's.
  const replyRow = visitor.locator(".bubble-row", { hasText: "Hi Sam, the refund is on its way." });
  await replyRow.waitFor({ timeout: 15_000 });
  expect(await replyRow.locator(".bubble-author").textContent()).toContain("Ada Teammate");
  expect(await replyRow.textContent()).not.toContain("Passed to the support team");
  await visitor.locator(".messenger-owner strong", { hasText: "Ada Teammate" }).waitFor();
  await checkPage(visitor);

  await teammate.getByRole("button", { name: "Close" }).click();
  await teammate.locator(".conversation-head p", { hasText: "Closed" }).waitFor();
}, 150_000);
