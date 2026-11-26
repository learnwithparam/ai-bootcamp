import { randomBytes } from "node:crypto";
import { sql } from "drizzle-orm";
import { auth, MCP_RESOURCE, SCOPES } from "../../auth/auth";
import { cliClientId, db, searchItems } from "../../db/queries";
import { toolCalls } from "../../db/schema";
import { ask } from "../agent";
import { findTool } from "../tools/all";
import { type Caller, callTool } from "../tools/call";
import { deviceFlow, signIn, webAppFlow } from "./sign-in";
import { anaStory, benStory, type Call } from "./stories";

// bun run seed mcp-server-and-cli, after the catalog and the CLI.
// Two developers. Ana signed in from the terminal and from a web app she built, and called tools from both,
// from the tools page and in plain words. Ben has only used the tools page, so he has no connected apps.
// Every sign-in goes through the real OAuth flows, and every call through callTool, the one place a tool runs.
// One plain-words question asks the real model: well under one US cent. Running it again replaces it all.

export const SEED_PASSWORD = "seeded developer password";
const SEED_DOMAIN = "tools-seed.learnwithparam.test";
const STUDY_PLANNER = { name: "Study planner", redirect: "http://localhost:4100/oauth/callback" };

async function signUp(name: string, key: string, password = SEED_PASSWORD) {
  const email = `${key}@${SEED_DOMAIN}`;
  const { headers, response } = await auth.api.signUpEmail({
    body: { name, email, password },
    returnHeaders: true,
  });
  const cookie = headers
    .getSetCookie()
    .map((each) => each.split(";")[0])
    .join("; ");
  return { id: response.user.id, email, cookie };
}

async function wipe() {
  const seeded = sql`(select id from "user" where email like ${`%@${SEED_DOMAIN}`})`;
  await db.execute(sql`delete from ${toolCalls} where user_id in ${seeded}`);
  await db.execute(sql`delete from mcp_server.saved where user_id in ${seeded}`);
  // Consents, tokens and the web app's client go with the users: those tables cascade from "user".
  await db.execute(sql`delete from "user" where email like ${`%@${SEED_DOMAIN}`}`);
}

// A web app with a secret, registered by an owner account of its own, whose random password is thrown away.
async function registerStudyPlanner() {
  const owner = await signUp("Study planner owner", "study-planner-owner", randomBytes(32).toString("hex"));
  const client = await auth.api.adminCreateOAuthClient({
    headers: new Headers({ cookie: owner.cookie }),
    body: {
      client_name: STUDY_PLANNER.name,
      token_endpoint_auth_method: "client_secret_basic",
      grant_types: ["authorization_code", "refresh_token"],
      redirect_uris: [STUDY_PLANNER.redirect],
      scope: SCOPES,
      resources: [MCP_RESOURCE],
    },
  });
  if (!client.client_secret) throw new Error("The study planner was registered without a secret.");
  return { clientId: client.client_id, secret: client.client_secret, redirect: STUDY_PLANNER.redirect };
}

const newestId = async (userId: string) =>
  (
    await db.execute<{ id: number }>(
      sql`select coalesce(max(id), 0)::int as id from ${toolCalls} where user_id = ${userId}`,
    )
  ).rows[0]?.id ?? 0;

// Moves the calls one step made back in time, so the activity reads like ten days of work.
async function backdate(userId: string, afterId: number, hoursAgo: number) {
  await db.execute(sql`update ${toolCalls} set called_at = now() - make_interval(hours => ${hoursAgo})
    where user_id = ${userId} and id > ${afterId}`);
}

async function run(caller: Caller & { userId: string }, call: Call): Promise<number> {
  const before = await newestId(caller.userId);
  let cost = 0;
  if (call.ask) cost = (await ask(call.ask, caller.userId)).costUsd;
  else {
    const tool = findTool(call.tool);
    if (!tool) throw new Error(`No tool ${call.tool}.`);
    // A call the tool refuses is part of the story: it lands in the activity as failed.
    await callTool(tool, call.input, caller).catch((error: unknown) =>
      console.log(`  ${call.tool} failed as planned: ${error instanceof Error ? error.message : error}`),
    );
  }
  await backdate(caller.userId, before, call.hoursAgo);
  return cost;
}

async function tell(userId: string, story: Call[], apps: Record<string, string>) {
  let cost = 0;
  for (const call of story) {
    const via = call.app ? "app" : call.ask ? "ask" : "page";
    cost += await run({ userId, via, clientId: call.app ? (apps[call.app] ?? null) : null }, call);
  }
  return cost;
}

await wipe();
const cli = await cliClientId();
if (!cli) throw new Error("Register the CLI first: bun auth/register-cli.ts");
const planner = await registerStudyPlanner();
const ana = await signUp("Ana Ruiz", "ana");
const ben = await signUp("Ben Osei", "ben");
await deviceFlow(cli, await signIn(ana.email, SEED_PASSWORD));
await webAppFlow(planner, await signIn(ana.email, SEED_PASSWORD));
const [first, second] = await searchItems("agents", "lab", 2);
if (!first || !second) throw new Error("The catalog has too few labs. Run the catalog seed first.");
const urls = [first.url, second.url] as const;
const cost =
  (await tell(ana.id, anaStory(urls), { cli, planner: planner.clientId })) +
  (await tell(ben.id, benStory(urls), {}));
console.log(`Seeded Ana with two apps and Ben with none. Model cost: $${cost.toFixed(4)}.`);
console.log(`Sign in as ana@${SEED_DOMAIN} or ben@${SEED_DOMAIN} with "${SEED_PASSWORD}".`);
process.exit(0);
