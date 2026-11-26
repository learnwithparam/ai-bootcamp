import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { sql } from "drizzle-orm";
import { deviceFlow, signIn } from "../agent/seed/sign-in";
import { findTool } from "../agent/tools/all";
import { callTool } from "../agent/tools/call";
import { POST as askRoute } from "../app/api/ask/route";
import { auth } from "../auth/auth";
import { activityOf } from "../db/activity";
import { appsOf, hasGrant, revokeApp } from "../db/apps";
import { cliClientId, db } from "../db/queries";
import { saved, toolCalls } from "../db/schema";

// The developer pages against the real database: the activity log, connected apps, revoking, and
// who may ask in plain words. The account signs in through the CLI's real device flow.

const TEST_DOMAIN = "tools-test.learnwithparam.test";
const EMAIL = `apps-test-${crypto.randomUUID()}@${TEST_DOMAIN}`;
const PASSWORD = "apps test password";
let userId = "";
let cli = "";

beforeAll(async () => {
  const { user } = await auth.api.signUpEmail({
    body: { name: "Apps Test", email: EMAIL, password: PASSWORD },
  });
  userId = user.id;
  const found = await cliClientId();
  if (!found) throw new Error("Register the CLI first: bun run seed mcp-server-and-cli");
  cli = found;
});

// Every account on the test domain goes, so a run that stopped half way leaves nothing behind.
afterAll(async () => {
  const testUsers = sql`(select id from "user" where email like ${`%@${TEST_DOMAIN}`})`;
  await db.execute(sql`delete from ${toolCalls} where user_id in ${testUsers}`);
  await db.execute(sql`delete from ${saved} where user_id in ${testUsers}`);
  // Their consents and tokens cascade from the account.
  await db.execute(sql`delete from "user" where email like ${`%@${TEST_DOMAIN}`}`);
});

const tool = (name: string) => {
  const found = findTool(name);
  if (!found) throw new Error(`No tool ${name}.`);
  return found;
};

describe("the activity log", () => {
  test("a call that works and one that fails both land in the account's activity", async () => {
    await callTool(tool("search_catalog"), { query: "agents" }, { userId, via: "page" });
    const failed = callTool(tool("search_catalog"), { query: "a" }, { userId, via: "app", clientId: cli });
    expect(failed).rejects.toThrow();
    await failed.catch(() => undefined);
    const [newest, older] = await activityOf(userId);
    expect(newest).toMatchObject({ tool: "search_catalog", via: "app", outcome: "failed" });
    expect(newest?.message).toContain("2 characters");
    expect(newest?.appName).toBeTruthy();
    expect(older).toMatchObject({ via: "page", outcome: "done", message: null });
  });

  test("a signed-out call belongs to nobody, so it is not kept", async () => {
    const before = (await db.select().from(toolCalls)).length;
    await callTool(tool("search_catalog"), { query: "agents" }, { userId: null, via: "page" });
    expect((await db.select().from(toolCalls)).length).toBe(before);
  });
});

describe("connected apps", () => {
  test("after a sign-in the CLI is listed, last used at its newest call, then revoking locks it out", async () => {
    await deviceFlow(cli, await signIn(EMAIL, PASSWORD));
    expect(await hasGrant(userId, cli)).toBe(true);
    const [app] = await appsOf(userId);
    expect(app).toMatchObject({ clientId: cli, how: "device" });
    expect(app?.lastUsed).toBeInstanceOf(Date);

    expect(await revokeApp(userId, cli)).toBe(true);
    // The /mcp route asks hasGrant on every call, so the CLI's still-valid token is refused from now on.
    expect(await hasGrant(userId, cli)).toBe(false);
    expect(await appsOf(userId)).toEqual([]);
    expect(await revokeApp(userId, cli)).toBe(false);
    // A real device sign-in signs its first tokens, which takes a few seconds on a cold start.
  }, 20_000);
});

describe("ask in plain words", () => {
  const post = (headers: HeadersInit, question: string) =>
    askRoute(
      new Request("http://test.invalid/api/ask", {
        method: "POST",
        headers,
        body: JSON.stringify({ question }),
      }),
    );

  test("refuses a caller who is not signed in, before any model call", async () => {
    const response = await post({ "content-type": "application/json" }, "What is on next week?");
    expect(response.status).toBe(401);
  });

  test("refuses an empty question and one that is too long", async () => {
    const cookie = await signIn(EMAIL, PASSWORD);
    expect((await post({ cookie }, "  ")).status).toBe(400);
    expect((await post({ cookie }, "x".repeat(501))).status).toBe(400);
  });
});
