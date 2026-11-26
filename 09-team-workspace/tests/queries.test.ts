import { afterAll, describe, expect, test } from "bun:test";
import { editMemory, forget, memoriesOf, remember } from "../db/memories";
import { chatFor, db, openChat } from "../db/queries";
import { memories } from "../db/schema";
import { open, seal } from "../db/sealed";
import { MEMORY } from "../rules/memory";
import { removeAccounts } from "./accounts";

// The queries run against a real Postgres, with ids no real account has, removed afterwards.
const ana = `rules-test-${crypto.randomUUID()}`;
const ben = `rules-test-${crypto.randomUUID()}`;
afterAll(() => removeAccounts([ana, ben]));

describe("the memory queries", () => {
  test("a secret is refused by the database layer too, and memories are per person", async () => {
    expect(await remember(ana, "My password is orange-kettle-42", null)).toHaveProperty("refused");
    const saved = await remember(ana, "Leads the data team.", null);
    if (!("id" in saved)) throw new Error(saved.refused);
    expect(await memoriesOf(ben)).toEqual([]);
    expect(await editMemory(ben, saved.id, "Leads nothing.")).toBe("That memory is gone.");
    expect(await editMemory(ana, saved.id, "My password is orange-kettle-42")).toContain("password");
    expect(await editMemory(ana, saved.id, "Leads the data team in Lisbon.")).toBeNull();
    expect((await memoriesOf(ana)).map((memory) => memory.text)).toEqual(["Leads the data team in Lisbon."]);
    expect(await forget(ben, saved.id)).toBe(false);
    expect(await forget(ana, saved.id)).toBe(true);
  });

  test("ten memories saved at once never pass the limit", async () => {
    // The first 95 go in at once: 95 separate saves would test the machine's speed, not the limit.
    const earlier = Array.from({ length: MEMORY.perPerson - 5 }, (_, index) => ({
      userId: ben,
      text: `Fact number ${index}.`,
      chatId: null,
    }));
    await db.insert(memories).values(earlier);
    const results = await Promise.all(
      Array.from({ length: 10 }, (_, index) => remember(ben, `Late fact ${index}.`, null)),
    );
    expect(results.filter((result) => "id" in result)).toHaveLength(5);
    expect(await memoriesOf(ben)).toHaveLength(MEMORY.perPerson);
  });
});

describe("the chat queries", () => {
  test("a chat opens only for the person who started it", async () => {
    const id = crypto.randomUUID();
    expect((await openChat(id, ana, "Mine"))?.userId).toBe(ana);
    expect(await openChat(id, ben, "Taken")).toBeNull();
    expect(await chatFor(id, ben)).toBeNull();
  });

  test("a sealed secret opens again, and the stored text does not show it", () => {
    const sealed = seal("client-secret-value");
    expect(sealed).not.toContain("client-secret-value");
    expect(open(sealed)).toBe("client-secret-value");
  });
});
