import { afterAll, describe, expect, test } from "bun:test";
import { inArray } from "drizzle-orm";
import { allItems, db, savedItems, saveItem, searchItems } from "../db/queries";
import { saved } from "../db/schema";
import { kindOf, parseCatalog, parseLine, upcoming } from "../rules/catalog";
import { samePath } from "../rules/same-path";

// The rules, with no model. The database tests use the seeded Postgres: run `bun run setup` first.

const ASHA = `test-${crypto.randomUUID()}`;
const RAVI = `test-${crypto.randomUUID()}`;

afterAll(async () => {
  await db.delete(saved).where(inArray(saved.userId, [ASHA, RAVI]));
});

describe("reading llms.txt", () => {
  const text = [
    "## Upcoming live labs",
    "- [Trace AI Agents](https://www.learnwithparam.com/labs/trace): 1 hour, 2026-12-10. Track cost and failures.",
    "## Past labs",
    "- [Secure AI Agents](https://www.learnwithparam.com/labs/secure): ran 2026-11-05. Agents with their own identity.",
    "## Blog",
    "- [Trace AI Agents](https://www.learnwithparam.com/labs/trace): listed twice, the first listing wins.",
    "## More",
    "- [About](https://www.learnwithparam.com/about)",
  ].join("\n");

  test("each heading gives its items a kind, and unknown headings are skipped", () => {
    const items = parseCatalog(text);
    expect(items.map((item) => [item.kind, item.title])).toEqual([
      ["upcoming", "Trace AI Agents"],
      ["lab", "Secure AI Agents"],
    ]);
    expect(kindOf("More")).toBeNull();
  });

  test("the length and date are read off the front of the summary", () => {
    const line = "- [Trace](https://x.test/t): 1 hour, 2026-12-10. Track cost.";
    expect(parseLine(line, "upcoming")).toMatchObject({
      duration: "1 hour",
      date: "2026-12-10",
      summary: "Track cost.",
    });
  });

  test("only sessions from today on are upcoming, soonest first", () => {
    const items = parseCatalog(text);
    expect(upcoming(items, "2026-12-10").map((item) => item.title)).toEqual(["Trace AI Agents"]);
    expect(upcoming(items, "2026-12-11")).toEqual([]);
  });
});

describe("where sign-in sends you next", () => {
  test("a path on this site is kept, with its query", () => {
    expect(samePath("/device?user_code=ABCD1234")).toBe("/device?user_code=ABCD1234");
  });

  test("anything that could leave the site lands on the home page", () => {
    for (const next of ["https://evil.com", "//evil.com", "/\\evil.com", "/\\/evil.com", undefined]) {
      expect(samePath(next)).toBe("/");
    }
  });
});

describe("the database", () => {
  test("the catalog is seeded", async () => {
    expect((await allItems()).length).toBeGreaterThan(20);
  });

  test("search finds by words and can be narrowed to one kind", async () => {
    const [first] = await allItems();
    if (!first) throw new Error("No catalog in Postgres. Run `bun run seed mcp-server-and-cli`.");
    const found = await searchItems(first.title, first.kind, 5);
    expect(found[0]?.url).toBe(first.url);
    expect(found.every((item) => item.kind === first.kind)).toBe(true);
  });

  test("each account sees only its own saved list, and saving twice keeps one", async () => {
    const [first, second] = await allItems();
    if (!first || !second) throw new Error("No catalog in Postgres.");
    await saveItem(ASHA, first.url);
    await saveItem(ASHA, first.url);
    await saveItem(RAVI, second.url);
    expect((await savedItems(ASHA)).map((item) => item.url)).toEqual([first.url]);
    expect((await savedItems(RAVI)).map((item) => item.url)).toEqual([second.url]);
  });
});
