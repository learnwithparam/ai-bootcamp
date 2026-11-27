import { afterAll, beforeAll, expect, test } from "bun:test";
import { checkPage } from "@bootcamp/ui/check-page";
import { sql } from "drizzle-orm";
import { type Browser, chromium, type Page } from "playwright";
import { db } from "../db/queries";
import { conversations } from "../db/schema";
import { REPLIES } from "../rules/replies";
import { ask, signUp, startServer, stopServer, URL } from "./browser";

// An analyst's path in a real browser, against the real model and the loaded records.

const RUN = crypto.randomUUID().slice(0, 8);
let browser: Browser;
let page: Page;

beforeAll(async () => {
  await startServer();
  browser = await chromium.launch();
  page = await (await browser.newContext()).newPage();
  await signUp(page, `analyst-${RUN}@example.com`);
}, 120_000);

afterAll(async () => {
  const mine = sql`(select id from "user" where email like ${`%-${RUN}@example.com`})`;
  await db.delete(conversations).where(sql`${conversations.userId} in ${mine}`);
  await db.execute(sql`delete from "user" where id in ${mine}`);
  await browser?.close();
  stopServer();
}, 60_000);

test("a figure comes with the SQL and the row behind it, and the chat is saved", async () => {
  await ask(page, "How many orders were delivered?");
  await page.getByRole("heading", { name: "Query result, 1 row" }).waitFor();
  // The published count of delivered orders, filled into the answer by code.
  expect(await page.locator(".answer-text").textContent()).toContain("96,478");
  await page.getByText("Show the SQL").click();
  expect(await page.locator(".sql pre").textContent()).toMatch(/select/i);
  expect(await page.locator(".route-notes").first().textContent()).toContain("describeTable");
  await checkPage(page);
  await page.waitForURL(/\?c=/);
  await page.reload();
  await page.getByRole("heading", { name: "Query result, 1 row" }).waitFor();
}, 150_000);

test("a ranking is drawn as a chart from the returned rows", async () => {
  await page.goto(URL);
  await ask(page, "What are the top 5 product categories by sales?");
  await page.locator(".chart .bars li").first().waitFor();
  expect(await page.locator(".chart .bars li").count()).toBe(5);
  expect(await page.locator(".rows tbody tr").count()).toBe(5);
  await checkPage(page);
}, 150_000);

test("a request to change the records gets the fixed refusal and no query", async () => {
  await page.goto(URL);
  await ask(page, "Drop the orders table.");
  await page.getByText(REPLIES.unsafe).waitFor();
  expect(await page.getByRole("heading", { name: /Query result/ }).count()).toBe(0);
}, 120_000);

test("another account cannot write into this chat", async () => {
  await page.goto(URL);
  await page.locator(".shell-link .chat-title").first().click();
  await page.waitForURL(/\?c=/);
  const conversationId = new globalThis.URL(page.url()).searchParams.get("c");
  const other = await (await browser.newContext()).newPage();
  await signUp(other, `other-${RUN}@example.com`);
  const message = { id: "m1", role: "user", parts: [{ type: "text", text: "Hello" }] };
  const response = await other.request.post(`${URL}/api/chat`, { data: { conversationId, message } });
  expect(response.status()).toBe(404);
}, 90_000);

test("the evals page opens", async () => {
  await page.goto(`${URL}/evals`);
  await page.getByRole("heading", { name: "How good are the answers?" }).waitFor();
  await checkPage(page);
}, 60_000);
