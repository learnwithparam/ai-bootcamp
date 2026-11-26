import { afterAll, beforeAll, expect, test } from "bun:test";
import { findProduct } from "@bootcamp/products";
import { checkPage } from "@bootcamp/ui/check-page";
import { type Browser, chromium, type Page } from "playwright";
import { saveRun } from "../db/queries";
import { makeAccount, PASSWORD, removeAccounts } from "./accounts";
import { ensureRunning } from "./server";
import { asFile, sampleSession } from "./session";

// Both people's paths in a real browser. The developer sends a run the way `bun run code upload` does,
// the reviewer reads it on every tab and asks for changes, and the developer sees the note and no form.
// A signed-in stranger gets a 404, and the upload API refuses everything it should.

const URL = `http://localhost:${findProduct("coding-agent").port}`;
const accounts: Record<"developer" | "reviewer" | "stranger", { id: string; email: string }> = {} as never;
const stops: (() => void)[] = [];
let browser: Browser;

beforeAll(async () => {
  stops.push(await ensureRunning("coding-agent", `${URL}/sign-in`));
  browser = await chromium.launch();
  accounts.developer = await makeAccount("Test Developer", "developer");
  accounts.reviewer = await makeAccount("Test Reviewer", "reviewer");
  accounts.stranger = await makeAccount("Test Stranger", null);
}, 120_000);

afterAll(async () => {
  await removeAccounts(Object.values(accounts).map((account) => account.id));
  await browser?.close();
  for (const stop of stops) stop();
});

async function signIn(email: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto(`${URL}/sign-in`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/sign-in"));
  return page;
}

// The cookie a terminal login gets, from the same sign-in endpoint.
async function cookieFor(email: string): Promise<string> {
  const response = await fetch(`${URL}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: URL },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  return (response.headers.getSetCookie()[0] ?? "").split(";")[0] ?? "";
}

const upload = (body: string, cookie = "") =>
  fetch(`${URL}/api/runs`, { method: "POST", headers: { cookie }, body });

test("the upload API refuses what it should and saves a real session", async () => {
  const file = asFile(sampleSession());
  const developer = await cookieFor(accounts.developer.email);
  expect((await upload(file)).status).toBe(401);
  expect((await upload(file, await cookieFor(accounts.reviewer.email))).status).toBe(403);
  expect((await upload("x".repeat(2_000_001), developer)).status).toBe(413);
  const broken = await upload("not json", developer);
  expect(broken.status).toBe(400);
  expect((await broken.json()).error).toBe("The session file is not valid JSON lines.");
  const saved = await upload(file, developer);
  expect(saved.status).toBe(201);
  expect((await saved.json()).id).toMatch(/^[0-9a-f-]{36}$/);
}, 60_000);

test("a stranger signed in gets a 404", async () => {
  const page = await signIn(accounts.stranger.email);
  expect((await page.goto(`${URL}/`))?.status()).toBe(404);
}, 60_000);

test("the reviewer reads every tab and asks for changes; the developer sees the note", async () => {
  const runId = await saveRun(accounts.developer.id, sampleSession());
  const reviewer = await signIn(accounts.reviewer.email);
  await reviewer
    .getByRole("link", { name: /Support months/ })
    .first()
    .waitFor();
  await checkPage(reviewer);
  for (const tab of ["changes", "checks", "replay"]) {
    await reviewer.goto(`${URL}/runs/${runId}?tab=${tab}`);
    await checkPage(reviewer);
  }
  // An edit opens behind its own fold, so the replay reads as a list of steps.
  await reviewer.getByText("Show the change").click();
  await reviewer.getByText(/^Took out:/).waitFor();
  await reviewer.getByRole("button", { name: "Back" }).click();
  await reviewer.getByText("Ask for changes").click();
  await reviewer.getByLabel("Note for the developer").fill("Name the month constant in full.");
  await reviewer.getByRole("button", { name: "Send review" }).click();
  await reviewer.getByRole("status").filter({ hasText: "Review sent" }).waitFor();
  await checkPage(reviewer);

  const developer = await signIn(accounts.developer.email);
  await developer.goto(`${URL}/runs/${runId}`);
  await developer.getByText("Name the month constant in full.").waitFor();
  expect(await developer.getByRole("button", { name: "Send review" }).count()).toBe(0);
  await developer.goto(`${URL}/terminal`);
  await developer.getByRole("heading", { name: "Run the agent from the terminal" }).waitFor();
  await checkPage(developer);
}, 120_000);
