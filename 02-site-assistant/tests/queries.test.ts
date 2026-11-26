import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq, like } from "drizzle-orm";
import {
  appendMessages,
  conversationFor,
  handOffConversation,
  latestFor,
  messagesOf,
  startConversation,
} from "../db/conversations";
import { assign, close, inboxRows, reply } from "../db/inbox";
import {
  addToSupportTeam,
  customerOf,
  db,
  isOnSupportTeam,
  recordTurn,
  savePage,
  searchSections,
  usageFor,
} from "../db/queries";
import { conversations, pages, supportTeam, turns } from "../db/schema";
import { type StoredMessage, teammateReply } from "../rules/conversation";

// The database code against the real Postgres: run `bun run setup` first. Every row it makes is removed after.

const TEST_VISITOR = `test:${crypto.randomUUID()}`;
const TEST_ACCOUNT = `test-account-${crypto.randomUUID()}`;
const TEST_PAGE = `https://test.invalid/${crypto.randomUUID()}`;

// A run that stopped before its afterAll leaves its page behind, with the same embedding as this run's.
// Every test.invalid page is a test page, so each run starts by removing them.
async function removeTestPages() {
  await db.delete(pages).where(like(pages.url, "https://test.invalid/%"));
}
beforeAll(removeTestPages);

afterAll(async () => {
  await db.delete(turns).where(eq(turns.visitor, TEST_VISITOR));
  await db.delete(conversations).where(like(conversations.visitor, "test:%"));
  await db.delete(supportTeam).where(eq(supportTeam.userId, TEST_ACCOUNT));
  await removeTestPages();
});

const said = (text: string): StoredMessage => ({
  id: crypto.randomUUID(),
  role: "user",
  parts: [{ type: "text", text }],
});

async function newConversation(visitor = TEST_VISITOR) {
  const id = crypto.randomUUID();
  await startConversation({ id, visitor, userId: null, name: null, email: null, startedOn: "/" });
  return id;
}

describe("search and usage", () => {
  // A made-up embedding for this test's own page: three sections that each point a different way.
  // It tests the query, so no model is needed; the real embeddings are tested in agent.test.ts.
  const pointing = (axis: number) => Array.from({ length: 1536 }, (_, index) => (index === axis ? 1 : 0));

  test("a section's own embedding finds that section first, numbered from 1", async () => {
    const page = {
      title: "Test page",
      sections: ["One", "Two", "Three"].map((heading) => ({ heading, body: `The ${heading} section.` })),
    };
    await savePage(TEST_PAGE, page, [pointing(0), pointing(1), pointing(2)]);
    const found = await searchSections(pointing(1), 3);
    expect(found.map((each) => each.number)).toEqual([1, 2, 3]);
    expect(found[0]).toMatchObject({ url: TEST_PAGE, heading: "Two", title: "Test page" });
  });

  test("usage counts this visitor's questions and everyone's spend today", async () => {
    const before = await usageFor(TEST_VISITOR);
    await recordTurn({ visitor: TEST_VISITOR, action: "answer", confidence: 0.9, costUsd: 0.25 });
    const after = await usageFor(TEST_VISITOR);
    expect(after.questionsLastMinute).toBe(before.questionsLastMinute + 1);
    expect(after.spentTodayUsd).toBeCloseTo(before.spentTodayUsd + 0.25, 6);
  });
});

describe("conversations", () => {
  test("a conversation is found only by the visitor who started it", async () => {
    const id = await newConversation();
    expect(await conversationFor(id, TEST_VISITOR)).toMatchObject({ id, owner: "assistant" });
    expect(await conversationFor(id, `test:${crypto.randomUUID()}`)).toBeNull();
    expect((await latestFor(TEST_VISITOR))?.id).toBe(id);
  });

  test("a taken id cannot be started again, so nobody writes into a guessed conversation", async () => {
    const id = await newConversation();
    const again = {
      id,
      visitor: `test:${crypto.randomUUID()}`,
      userId: null,
      name: null,
      email: null,
      startedOn: "/",
    };
    expect(await startConversation(again)).toBe(false);
  });

  test("messages written at the same moment each get their own place, and a resend changes nothing", async () => {
    const id = await newConversation();
    const batch = Array.from({ length: 6 }, (_, index) => said(`message ${index}`));
    await Promise.all(batch.map((message) => appendMessages(id, [message])));
    await appendMessages(id, [
      { ...batch[0], parts: [{ type: "text", text: "rewritten" }] } as StoredMessage,
    ]);
    const saved = await messagesOf(id);
    expect(saved).toHaveLength(6);
    expect(saved.map((message) => message.parts[0]?.text).sort()).toEqual(
      batch.map((m) => m.parts[0]?.text).sort(),
    );
  });
});

describe("the hand-off", () => {
  test("a conversation is handed to the team once", async () => {
    const id = await newConversation();
    expect(await handOffConversation(id, "Wants a refund", "a@example.com")).toBe(true);
    expect(await handOffConversation(id, "Again", "b@example.com")).toBe(false);
    expect(await conversationFor(id, TEST_VISITOR)).toMatchObject({
      owner: "team",
      summary: "Wants a refund",
    });
  });
});

describe("the support inbox", () => {
  test("lists a conversation with its newest message, and leaves out one with no message", async () => {
    const spoken = await newConversation();
    const silent = await newConversation();
    await appendMessages(spoken, [said("first"), said("newest")]);
    const rows = await inboxRows();
    expect(rows.find((row) => row.id === spoken)?.last.parts[0]?.text).toBe("newest");
    expect(rows.some((row) => row.id === silent)).toBe(false);
  });

  test("two people clicking Assign at once: only one gets it", async () => {
    const id = await newConversation();
    const results = await Promise.all([
      assign(id, { id: "u1", name: "Ada" }),
      assign(id, { id: "u2", name: "Bo" }),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  test("a reply goes to the person who sent it, and reopens a closed conversation", async () => {
    const id = await newConversation();
    expect(await close(id)).toBe(true);
    expect(await close(id)).toBe(false);
    const message = teammateReply(crypto.randomUUID(), "Ada", "Refunded today.") as StoredMessage;
    await reply(id, { id: "u1", name: "Ada" }, message);
    const after = await conversationFor(id, TEST_VISITOR);
    expect(after).toMatchObject({ owner: "team", assigneeName: "Ada", closedAt: null });
    expect((await messagesOf(id)).at(-1)?.metadata).toEqual({ author: "teammate", name: "Ada" });
  });
});

// Access is keyed by account, never by email: anyone can sign up with an email they do not own.
describe("accounts", () => {
  test("an account reads the support inbox only after it is added, by account", async () => {
    expect(await isOnSupportTeam(TEST_ACCOUNT)).toBe(false);
    await addToSupportTeam(TEST_ACCOUNT);
    expect(await isOnSupportTeam(TEST_ACCOUNT)).toBe(true);
  });

  test("an account that never checked out has no Stripe customer", async () => {
    expect(await customerOf(TEST_ACCOUNT)).toBeNull();
  });
});
