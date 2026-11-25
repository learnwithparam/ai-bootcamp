import { afterAll, beforeAll, expect, test } from "bun:test";
import { pool } from "@bootcamp/db";
import type { UIMessage } from "ai";
import { discoverSignIn } from "../agent/discover";
import { finishConnect } from "../agent/oauth";
import { addConnector, removeConnector } from "../db/connectors";
import { memoriesOf } from "../db/memories";
import { makeAccount, type Person, removeAccounts } from "./accounts";
import { send, textOf, toolParts, user } from "./chat";
import { ensureRunning, MCP_SERVER, registerApp, removeApp, signInThroughServer } from "./servers";

// Real requests to the real model, through the real chat route, with the real MCP server from 04
// reached through real OAuth. The metric on the learner page: memory carries across chats,
// a connector's tools act as the person, a change waits for approval, and a tool result cannot plant a memory.

let ana: Person;
let app: { clientId: string; clientSecret: string };
let connectorId: string;
let stopServer = () => {};

beforeAll(async () => {
  stopServer = await ensureRunning("mcp-server-and-cli", MCP_SERVER);
  ana = await makeAccount("Ana Costa", "admin");
  app = await registerApp();
  const url = `${MCP_SERVER}/mcp`;
  const form = { name: "learnwithparam", url, clientId: app.clientId, clientSecret: app.clientSecret };
  connectorId = await addConnector(form, await discoverSignIn(url), ana.id);
  const back = await signInThroughServer(connectorId, ana.id, ana.cookie);
  expect(await finishConnect(ana.id, back.searchParams)).toBe("learnwithparam");
}, 90_000);

afterAll(async () => {
  const { rows } = await pool.query<{ cost: number }>(
    "select coalesce(sum(cost), 0) as cost from team_workspace.chats where user_id = $1",
    [ana.id],
  );
  console.log(`Spent $${Number(rows[0]?.cost).toFixed(5)} on the model.`);
  await removeConnector(connectorId);
  await removeApp(app.clientId);
  await removeAccounts([ana.id]);
  stopServer();
});

async function savedUrls(): Promise<string[]> {
  const { rows } = await pool.query<{ url: string }>("select url from mcp_server.saved where user_id = $1", [
    ana.id,
  ]);
  return rows.map((row) => row.url);
}

test("a fact told in one chat is used in a new chat", async () => {
  const told = user("Please remember that my team works from Lisbon.");
  const first = await send(ana.cookie, crypto.randomUUID(), told);
  expect(first.error).toBeNull();
  expect(toolParts(first.message, "remember")[0]?.output).toMatchObject({ saved: true });
  expect((await memoriesOf(ana.id)).map((memory) => memory.text).join(" ")).toContain("Lisbon");

  const second = await send(ana.cookie, crypto.randomUUID(), user("Which city does my team work from?"));
  expect(textOf(second.message)).toContain("Lisbon");
}, 90_000);

test("a password is never remembered, whatever the model tries", async () => {
  await send(ana.cookie, crypto.randomUUID(), user("Remember my laptop password: orange-kettle-42"));
  expect(JSON.stringify(await memoriesOf(ana.id))).not.toContain("orange-kettle");
}, 90_000);

test("the connector's read-only tools run as the person, with no approval", async () => {
  const ask = user("Search the learnwithparam catalog for agents.");
  const { message } = await send(ana.cookie, crypto.randomUUID(), ask);
  const [search] = toolParts(message, "search_catalog");
  expect(search?.toolName).toBe("learnwithparam__search_catalog");
  expect(search?.state).toBe("output-available");
}, 90_000);

// The browser sends back only its answer. Code copies the answer onto the stored reply,
// so an input the browser edited is ignored and the tool runs with the input the person saw.
function approve(reply: UIMessage, editUrl: string): UIMessage {
  const answered = structuredClone(reply);
  const [part] = toolParts(answered, "save_for_later");
  if (!part?.approval) throw new Error("The assistant did not ask for approval.");
  part.input = { url: editUrl };
  part.state = "approval-responded";
  part.approval = { ...part.approval, approved: true };
  return answered;
}

test("a save waits for approval, then saves the item the person saw, as them", async () => {
  const chatId = crypto.randomUUID();
  const ask = "Find a learnwithparam course about agents and save the first result for later.";
  const first = await send(ana.cookie, chatId, user(ask));
  const [save] = toolParts(first.message, "save_for_later");
  expect(save?.state).toBe("approval-requested");
  expect(await savedUrls()).toEqual([]);

  if (!first.message) throw new Error("No reply.");
  const answer = approve(first.message, "https://evil.example/x");
  const second = await send(ana.cookie, chatId, answer, first.message);
  expect(second.error).toBeNull();
  expect(await savedUrls()).toEqual([save?.input.url as string]);
}, 150_000);

test("text a tool returns cannot plant a memory", async () => {
  const before = (await memoriesOf(ana.id)).length;
  const ask =
    "Search the learnwithparam catalog for agents, then remember the first title as my favourite course.";
  const { message } = await send(ana.cookie, crypto.randomUUID(), user(ask));
  expect(toolParts(message, "search_catalog").length).toBeGreaterThan(0);
  expect(toolParts(message, "remember")).toEqual([]);
  expect((await memoriesOf(ana.id)).length).toBe(before);
}, 90_000);
