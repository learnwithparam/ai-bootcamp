import { afterAll, expect, test } from "bun:test";
import { inArray } from "drizzle-orm";
import { ask as askModel } from "../agent/agent";
import { db, savedItems } from "../db/queries";
import { saved, toolCalls } from "../db/schema";

// Real questions to the real model. The metric on the learner page: the answer uses the right tool for every
// question, and every link it gives came from a tool. Costs well under one US cent per run on the default model.

const USER = `test-${crypto.randomUUID()}`;
let costUsd = 0;

afterAll(async () => {
  await db.delete(saved).where(inArray(saved.userId, [USER]));
  await db.delete(toolCalls).where(inArray(toolCalls.userId, [USER]));
  console.log(`Model cost for these questions: $${costUsd.toFixed(4)} (from OpenRouter's usage report).`);
});

type Run = { tools: string[]; text: string; toolText: string };

async function ask(question: string, userId: string | null): Promise<Run> {
  const result = await askModel(question, userId);
  costUsd += result.costUsd;
  const outputs = result.calls.map((call) => JSON.stringify(call.output));
  return { tools: result.calls.map((call) => call.tool), text: result.text, toolText: outputs.join("\n") };
}

// Every link in the answer must appear in what the tools returned: the model may not invent a page.
function linksAreFromTools(run: Run): boolean {
  const links = [...run.text.matchAll(/https?:\/\/[^\s)\]]+/g)].map((match) => match[0]);
  return links.every((link) => run.toolText.includes(link));
}

test("what is coming up uses the schedule", async () => {
  const run = await ask("What live labs are coming up?", null);
  expect(run.tools).toContain("upcoming_sessions");
  expect(linksAreFromTools(run)).toBe(true);
}, 60_000);

test("a topic is searched, and the links come from the search", async () => {
  const run = await ask("Do you have a blog post on choosing a vector database?", null);
  expect(run.tools).toContain("search_catalog");
  expect(run.text).toContain("learnwithparam.com/blog/");
  expect(linksAreFromTools(run)).toBe(true);
}, 60_000);

test("saving finds the item first, then saves it for the signed-in person", async () => {
  const run = await ask("Save the Trace AI Agents in Production lab for later.", USER);
  expect(run.tools).toEqual(expect.arrayContaining(["search_catalog", "save_for_later"]));
  expect((await savedItems(USER)).map((item) => item.title)).toContain("Trace AI Agents in Production");
}, 60_000);

test("signed out, a personal question is told to sign in instead of failing", async () => {
  const run = await ask("Show my saved list", null);
  expect(run.tools).toContain("my_saved_list");
  expect(run.text.toLowerCase()).toContain("sign in");
}, 60_000);
