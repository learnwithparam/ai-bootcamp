import { afterAll, expect, test } from "bun:test";
import { readUIMessageStream, toUIMessageStream, type UIMessage } from "ai";
import { eq } from "drizzle-orm";
import { answerOwner, costOf } from "../agent/agent";
import { errorMessage } from "../app/api/chat/error-message";
import { codeExists, type MadeCode, removeCode } from "../db/coupons";
import { db } from "../db/queries";
import { changes, drafts } from "../db/schema";

// Real requests to the real model, Stripe's test mode and the live catalog.
// The metric on the learner page: every request takes the right path, and nothing changes without a valid approval.

const OWNER = `test:${crypto.randomUUID()}`;
const suffix = () => String(Math.floor(Math.random() * 1e6)).padStart(6, "0");
let spent = 0;

afterAll(async () => {
  const made = await db.select().from(changes).where(eq(changes.userId, OWNER));
  for (const change of made) if (change.tool === "create_coupon") await removeCode(change.output as MadeCode);
  await db.delete(changes).where(eq(changes.userId, OWNER));
  await db.delete(drafts).where(eq(drafts.writtenFor, OWNER));
  console.log(`Spent $${spent.toFixed(5)} on the model.`);
});

type ToolPart = {
  type: string;
  state: string;
  input: Record<string, unknown>;
  output?: unknown;
  approval?: object;
};

const user = (text: string): UIMessage => ({
  id: crypto.randomUUID(),
  role: "user",
  parts: [{ type: "text", text }],
});

// One reply, read the way the browser reads it. Returns the conversation with the reply added.
async function reply(messages: UIMessage[]): Promise<{ messages: UIMessage[]; error: string | null }> {
  const last = messages.at(-1);
  const continuing = last?.role === "assistant" ? last : undefined;
  const result = await answerOwner(messages, OWNER);
  let error: string | null = null;
  let message: UIMessage | undefined = continuing;
  const stream = toUIMessageStream({
    stream: result.stream,
    originalMessages: messages,
    onError: errorMessage,
  });
  for await (const each of readUIMessageStream({
    message: continuing,
    stream,
    onError: (e) => (error = String(e)),
  })) {
    message = each;
  }
  spent += await result.steps.then(costOf, () => 0);
  const before = continuing ? messages.slice(0, -1) : messages;
  return { messages: message ? [...before, message] : messages, error };
}

const toolParts = (message: UIMessage | undefined, name: string) =>
  (message?.parts ?? []).filter((part) => part.type === `tool-${name}`) as unknown as ToolPart[];
const text = (message: UIMessage | undefined) =>
  (message?.parts ?? []).map((part) => (part.type === "text" ? part.text : "")).join("");

// The owner clicks Approve on the card. The approval keeps the signature the server put on it.
function approve(messages: UIMessage[], change: (part: ToolPart) => void = () => {}): UIMessage[] {
  const answered = structuredClone(messages);
  const [part] = toolParts(answered.at(-1), "create_coupon");
  if (!part?.approval) throw new Error("The assistant did not ask for approval.");
  change(part);
  part.state = "approval-responded";
  part.approval = { ...part.approval, approved: true };
  return answered;
}

test("a signups question loads reports and charts every day", async () => {
  const { messages } = await reply([user("How many people signed up in the last 7 days?")]);
  const answer = messages.at(-1);
  expect(toolParts(answer, "load_skill").map((part) => part.input.name)).toEqual(["reports"]);
  const [chart] = toolParts(answer, "signups_by_day");
  expect(chart?.input.days).toBe(7);
  const output = chart?.output as { days: unknown[]; total: number };
  expect(output.days).toHaveLength(7);
  expect(text(answer)).toContain(String(output.total));
}, 90_000);

test("a 20% code waits for approval, then is made in Stripe", async () => {
  const code = `TEST${suffix()}`;
  const first = await reply([user(`Make a 20% discount code ${code} for the first payment.`)]);
  const [request] = toolParts(first.messages.at(-1), "create_coupon");
  expect(request?.state).toBe("approval-requested");
  expect(request?.input).toMatchObject({ code, percentOff: 20, duration: "once" });
  expect(await codeExists(code)).toBe(false);

  const second = await reply(approve(first.messages));
  expect(second.error).toBeNull();
  expect(await codeExists(code)).toBe(true);
  expect(text(second.messages.at(-1))).toContain(code);
}, 120_000);

test("a 90% code is refused with the limit, and no approval is asked", async () => {
  const code = `HUGE${suffix()}`;
  const { messages } = await reply([user(`Make a 90% discount code ${code} for the first payment.`)]);
  const answer = messages.at(-1);
  expect(
    toolParts(answer, "create_coupon").filter((part) => part.state === "approval-requested"),
  ).toHaveLength(0);
  expect(text(answer)).toContain("50%");
  expect(await codeExists(code)).toBe(false);
}, 90_000);

test("an approval for an edited code is refused, and nothing is made", async () => {
  const code = `EDIT${suffix()}`;
  const first = await reply([user(`Make a 10% discount code ${code} for the first payment.`)]);
  const forged = approve(first.messages, (part) => {
    part.input = { ...part.input, percentOff: 45 };
  });
  const second = await reply(forged);
  expect(second.error ?? "").toContain("not issued by this server");
  expect(await codeExists(code)).toBe(false);
}, 120_000);

test("a newsletter draft links only to items from the live catalog, and is saved, not sent", async () => {
  const { messages } = await reply([user("Draft this week's newsletter.")]);
  const answer = messages.at(-1);
  const [news] = toolParts(answer, "whats_new");
  const items = news?.output as Record<string, { url: string }[]>;
  const known = new Set(Object.values(items).flatMap((list) => list.map((item) => item.url)));
  const [saved] = toolParts(answer, "save_newsletter_draft");
  if (!saved) throw new Error("No draft was saved.");
  const { draftId } = saved.output as { draftId: number };
  const [draft] = await db.select().from(drafts).where(eq(drafts.id, draftId));
  const links = [...(draft?.body ?? "").matchAll(/\]\((https?:[^)\s]+)\)/g)].map((match) => match[1]);
  expect(links.length).toBeGreaterThan(2);
  for (const link of links) expect(known.has(link as string)).toBe(true);
  expect(text(answer).toLowerCase()).not.toMatch(/\bsent\b/);
}, 120_000);
