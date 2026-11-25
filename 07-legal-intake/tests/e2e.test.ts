import { afterAll, beforeAll, expect, test } from "bun:test";
import { type ChildProcess, spawn } from "node:child_process";
import { findProduct } from "@bootcamp/products";
import { checkPage } from "@bootcamp/ui/check-page";
import { type Browser, chromium, type Page } from "playwright";
import { checkpoints } from "../db/checkpoints";
import { addStaff, queue, removeIntakes } from "../db/queries";
import { makeAccount, PASSWORD, removeAccounts } from "./accounts";

// The whole path in a real browser, with the real model: a client talks and the form fills in, with no account.
// A lawyer decides and approves the letter, a paralegal sees the same matter but cannot decide,
// and the client reads the letter on their private link. A signed-in account that is not staff gets a 404.

const URL = `http://localhost:${findProduct("legal-intake").port}`;
const EMAIL = `client-${crypto.randomUUID()}@example.com`;
// A plain name the model will copy as written, and one no other request on the board has, so the test can click it.
const FIRST = ["Lena", "Priya", "Owen", "Nadia", "Felix", "Ruth"];
const LAST = ["Marsh", "Holloway", "Achebe", "Lindqvist", "Moreau", "Castellano"];
let CLIENT = "";
let server: ChildProcess | undefined;
let browser: Browser;
const accounts: { id: string; email: string }[] = [];

async function isUp(): Promise<boolean> {
  const response = await fetch(`${URL}/sign-in`, { signal: AbortSignal.timeout(2_000) }).catch(
    () => undefined,
  );
  return response?.ok ?? false;
}

// Uses the server you already run with `bun run dev legal-intake`, or starts one for this test.
async function startServer() {
  if (await isUp()) return;
  server = spawn("bun", ["scripts/dev.ts", "legal-intake"], {
    detached: true,
    stdio: ["ignore", "ignore", "inherit"],
  });
  for (let attempt = 0; attempt < 60; attempt++) {
    if (await isUp()) return;
    await Bun.sleep(1_000);
  }
  throw new Error(`Legal intake did not start on ${URL}.`);
}

beforeAll(async () => {
  await startServer();
  const taken = new Set((await queue(1_000)).map((intake) => intake.clientName));
  const free = FIRST.flatMap((first) => LAST.map((last) => `${first} ${last}`)).find(
    (name) => !taken.has(name),
  );
  if (!free)
    throw new Error(
      "Every test name is already on the board. Delete the requests from earlier runs whose email starts with client-.",
    );
  CLIENT = free;
  browser = await chromium.launch();
  accounts.push(
    await makeAccount("Test Lawyer"),
    await makeAccount("Test Paralegal"),
    await makeAccount("Test Stranger"),
  );
  await addStaff(accounts[0]?.id as string, "lawyer");
  await addStaff(accounts[1]?.id as string, "paralegal");
}, 90_000);

afterAll(async () => {
  const mine = (await queue(200)).filter((intake) => intake.clientEmail === EMAIL).map((intake) => intake.id);
  await removeIntakes(mine);
  for (const id of mine) await checkpoints.deleteThread(id);
  await removeAccounts(accounts.map((account) => account.id));
  await browser?.close();
  if (server?.pid) process.kill(-server.pid);
});

async function signIn(email: string, staff = true): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto(`${URL}/sign-in`);
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password, at least 10 characters").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  if (staff) await page.getByRole("heading", { name: "Intake board" }).waitFor();
  else await page.waitForURL(`${URL}/queue`);
  return page;
}

// The client talks; the form fills in beside them. They add what the assistant has not filled, then send.
async function sendRequest(page: Page) {
  await page.goto(`${URL}/intake`);
  await page
    .getByLabel("Your message")
    .fill(
      `I'm ${CLIENT}. I cancelled my gym membership with Quayside Fitness Ltd in August, in writing, with the 30 days ` +
        "notice the contract asks for. They have taken 45 pounds from my account every month since, and say they never got the letter.",
    );
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await page.locator("#clientName.agent-filled").waitFor({ timeout: 30_000 });
  expect(await page.getByLabel("Your name").inputValue()).toBe(CLIENT);
  await page.getByLabel("Email for our reply").fill(EMAIL);
  const goal = page.getByLabel("What you want to happen");
  if (!(await goal.inputValue())) await goal.fill("Stop the payments and refund them");
  await checkPage(page);
  await page.getByRole("button", { name: "Send request" }).click();
  await page.waitForURL(/\/requests\/[\w-]{32}$/);
}

test("a stranger signed in gets a 404 on the board", async () => {
  const page = await signIn(accounts[2]?.email as string, false);
  expect((await page.goto(`${URL}/queue`))?.status()).toBe(404);
  expect((await page.goto(`${URL}/records`))?.status()).toBe(404);
}, 60_000);

test("a client talks, a lawyer accepts and approves, a paralegal cannot, the client reads the letter", async () => {
  const client = await (await browser.newContext()).newPage();
  await sendRequest(client);
  await client.getByText("A lawyer reads every request").waitFor();
  await checkPage(client);

  const paralegal = await signIn(accounts[1]?.email as string);
  await paralegal.getByRole("link", { name: CLIENT }).click();
  await paralegal
    .getByRole("button", { name: "Accept the matter", disabled: true })
    .waitFor({ timeout: 60_000 });
  await paralegal.getByText("Only a lawyer can accept or decline a matter.").waitFor();

  const lawyer = await signIn(accounts[0]?.email as string);
  await checkPage(lawyer);
  await lawyer.getByRole("link", { name: CLIENT }).click();
  await lawyer
    .getByRole("button", { name: "Accept the matter", disabled: false })
    .waitFor({ timeout: 60_000 });
  await checkPage(lawyer);
  await lawyer.getByRole("link", { name: "Conflicts" }).click();
  await lawyer.getByText("No name in this request matches the firm's records.").waitFor();
  await lawyer.getByRole("button", { name: "Accept the matter" }).click();

  await lawyer.getByRole("link", { name: "Review the letter" }).click({ timeout: 90_000 });
  const letter = lawyer.getByLabel("Letter to the client");
  await letter.fill(`${await letter.inputValue()}\n\nPlease bring your bank statements.`);
  await lawyer.getByRole("button", { name: "Approve and send" }).click();
  await lawyer.getByLabel("Letter sent").waitFor();
  await lawyer.getByRole("link", { name: "History" }).click();
  await lawyer.getByText("Lawyer approves finished").waitFor();
  await checkPage(lawyer);

  await client.reload();
  expect(await client.getByLabel("Our reply").textContent()).toContain("Please bring your bank statements.");
  await checkPage(client);
}, 240_000);
