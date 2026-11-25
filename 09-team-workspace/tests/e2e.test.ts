import { afterAll, beforeAll, expect, test } from "bun:test";
import { pool } from "@bootcamp/db";
import { type Browser, chromium, type Page } from "playwright";
import { discoverSignIn } from "../agent/discover";
import { APP_URL } from "../agent/oauth";
import { addConnector, removeConnector } from "../db/connectors";
import { makeAccount, PASSWORD, type Person, removeAccounts } from "./accounts";
import { ensureRunning, MCP_SERVER, registerApp, removeApp } from "./servers";

// The whole path in a real browser, with the real model and the real MCP server from 04:
// a member connects the server through its own sign-in page, tells the assistant a fact, finds the chat
// in the sidebar and the fact on the Memory page, and approves a save from the chat.
// A signed-in account that is not in the team gets a 404.

const NAME = `learnwithparam ${crypto.randomUUID().slice(0, 4)}`;
const stops: (() => void)[] = [];
let member: Person;
let stranger: Person;
let app: { clientId: string; clientSecret: string };
let connectorId = "";
let browser: Browser;

beforeAll(async () => {
  stops.push(
    await ensureRunning("mcp-server-and-cli", MCP_SERVER),
    await ensureRunning("team-workspace", `${APP_URL}/sign-in`),
  );
  browser = await chromium.launch();
  member = await makeAccount("Test Member", "member");
  stranger = await makeAccount("Test Stranger");
  app = await registerApp();
  const url = `${MCP_SERVER}/mcp`;
  const form = { name: NAME, url, clientId: app.clientId, clientSecret: app.clientSecret };
  connectorId = await addConnector(form, await discoverSignIn(url), member.id);
}, 120_000);

afterAll(async () => {
  await browser?.close();
  await removeConnector(connectorId);
  await removeApp(app.clientId);
  await removeAccounts([member.id, stranger.id]);
  for (const stop of stops) stop();
});

async function signIn(email: string): Promise<Page> {
  const page = await browser.newPage();
  await page.goto(`${APP_URL}/sign-in`);
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password, at least 10 characters").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForLoadState("networkidle");
  return page;
}

async function ask(page: Page, text: string) {
  await page.getByPlaceholder("Message the assistant").fill(text);
  await page.keyboard.press("Enter");
}

test("a signed-in account that is not in the team gets a 404", async () => {
  const page = await signIn(stranger.email);
  expect((await page.goto(`${APP_URL}/`))?.status()).toBe(404);
  expect((await page.goto(`${APP_URL}/memory`))?.status()).toBe(404);
}, 60_000);

// The MCP server's own sign-in page. The session is already there: both run on localhost.
async function connect(page: Page) {
  await page.goto(`${APP_URL}/connectors`);
  const row = page.getByRole("listitem").filter({ hasText: NAME });
  await row.getByRole("button", { name: "Connect" }).click();
  await page.waitForURL(/\/consent\?/);
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Allow" }).click();
  await page.waitForURL(/\/connectors\?/).catch(async (error) => {
    const shown = await page
      .locator(".form-error")
      .textContent()
      .catch(() => null);
    throw new Error(`Consent did not come back. Page: ${page.url()} Error shown: ${shown}`, { cause: error });
  });
  expect(new URL(page.url()).searchParams.get("failed")).toBeNull();
  await row.getByText("connected", { exact: true }).waitFor();
}

// Returns the chat's address, so the next step can tell a new chat from this one.
async function tellAFact(page: Page): Promise<string> {
  await page.getByRole("link", { name: "New chat" }).click();
  await ask(page, "Please remember that I prefer short answers.");
  await page.waitForURL(/\/chat\/[0-9a-f-]{36}$/, { timeout: 60_000 });
  const chat = page.url();
  await page.getByRole("link", { name: /prefer short answers/ }).waitFor();
  await page.goto(`${APP_URL}/memory`);
  await page
    .locator(".memory-row")
    .filter({ hasText: /short answers/ })
    .waitFor();
  return chat;
}

// New chat really is new: the save lands in its own chat, not the last one.
async function approveASave(page: Page, lastChat: string) {
  await page.getByRole("link", { name: "New chat" }).click();
  await ask(page, "Find a learnwithparam course about agents and save the first result for later.");
  await page.getByRole("button", { name: "Approve" }).click({ timeout: 60_000 });
  await page.waitForURL((url) => /\/chat\//.test(url.pathname) && url.href !== lastChat, { timeout: 90_000 });
  await page.waitForLoadState("networkidle");
}

test("a member connects, chats, finds the memory, and approves a save", async () => {
  const page = await signIn(member.email);
  await connect(page);
  await approveASave(page, await tellAFact(page));
  const saved = await pool.query("select url from mcp_server.saved where user_id = $1", [member.id]);
  expect(saved.rows).toHaveLength(1);
}, 240_000);
