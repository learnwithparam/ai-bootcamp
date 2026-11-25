import { afterAll, beforeAll, expect, test } from "bun:test";
import { type ChildProcess, spawn } from "node:child_process";
import { findProduct } from "@bootcamp/products";
import { type Browser, chromium, type Page } from "playwright";
import { checkpoints } from "../db/checkpoints";
import { addLawyer, queue, removeIntakes } from "../db/queries";
import { makeAccount, PASSWORD, removeAccounts } from "./accounts";

// The whole path in a real browser, with the real model: a client sends a request with no account,
// a lawyer decides and approves the letter, and the client reads it on their private link.
// A signed-in account that is not a lawyer gets a 404 on the queue.

const URL = `http://localhost:${findProduct("legal-intake").port}`;
const CLIENT = `Lena Marsh ${crypto.randomUUID().slice(0, 6)}`;
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
  browser = await chromium.launch();
  accounts.push(await makeAccount("Test Lawyer"), await makeAccount("Test Stranger"));
  await addLawyer(accounts[0]?.id as string);
}, 90_000);

afterAll(async () => {
  const mine = (await queue(200)).filter((intake) => intake.clientName === CLIENT).map((intake) => intake.id);
  await removeIntakes(mine);
  for (const id of mine) await checkpoints.deleteThread(id);
  await removeAccounts(accounts.map((account) => account.id));
  await browser?.close();
  if (server?.pid) process.kill(-server.pid);
});

async function signIn(email: string): Promise<Page> {
  const page = await browser.newPage();
  await page.goto(`${URL}/sign-in`);
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password, at least 10 characters").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(`${URL}/queue`);
  return page;
}

async function sendRequest(page: Page) {
  await page.goto(URL);
  await page.getByLabel("Your full name").fill(CLIENT);
  await page.getByLabel("Email for our reply").fill(`client-${crypto.randomUUID()}@example.com`);
  await page.getByLabel("Who is on the other side?").fill("Quayside Fitness Ltd");
  await page
    .getByLabel("What happened?")
    .fill(
      "I cancelled my gym membership with Quayside Fitness Ltd in August, in writing, with the 30 days notice " +
        "the contract asks for. They have taken 45 pounds from my account every month since, and say they never got the letter.",
    );
  await page.getByRole("button", { name: "Send request" }).click();
  await page.waitForURL(/\/requests\/[\w-]{32}$/);
}

test("a stranger signed in gets a 404 on the queue", async () => {
  const page = await signIn(accounts[1]?.email as string);
  expect(await page.getByRole("heading", { name: "Review queue" }).count()).toBe(0);
  expect((await page.goto(`${URL}/queue`))?.status()).toBe(404);
}, 60_000);

test("a client asks, a lawyer accepts and approves, the client reads the letter", async () => {
  const client = await browser.newPage();
  await sendRequest(client);
  await client.getByText("A lawyer reads every request").waitFor();

  const lawyer = await signIn(accounts[0]?.email as string);
  await lawyer.getByRole("link", { name: new RegExp(CLIENT) }).click();
  await lawyer.getByRole("button", { name: "Accept the matter" }).waitFor({ timeout: 60_000 });
  await expect(lawyer.getByText("No conflicts with the firm's records.").count()).resolves.toBe(1);
  await lawyer.getByRole("button", { name: "Accept the matter" }).click();

  const letter = lawyer.getByLabel("Letter to the client");
  await letter.waitFor({ timeout: 60_000 });
  await letter.fill(`${await letter.inputValue()}\n\nPlease bring your bank statements.`);
  await lawyer.getByRole("button", { name: "Approve and send" }).click();
  await lawyer.getByLabel("Letter sent").waitFor();

  await client.reload();
  await expect(client.getByLabel("Our reply").textContent()).resolves.toContain(
    "Please bring your bank statements.",
  );
}, 180_000);
