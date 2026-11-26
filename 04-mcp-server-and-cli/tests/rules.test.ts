import { afterAll, describe, expect, test } from "bun:test";
import { kindOf, parseCatalog, parseLine, upcoming } from "@bootcamp/catalog";
import { inArray } from "drizzle-orm";
import { allItems, db, savedItems, saveItem, searchItems } from "../db/queries";
import { saved } from "../db/schema";
import {
  cliCommand,
  dateWords,
  inputProblem,
  inputWords,
  mcpCall,
  scopeWords,
  viaWords,
  whenWords,
} from "../rules/plain";
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
    for (const next of [
      "https://evil.com",
      "//evil.com",
      "/\\evil.com",
      "/\\/evil.com",
      "/.//evil.com",
      "/..//evil.com",
      "/./\\evil.com",
      undefined,
    ]) {
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

describe("the developer pages in plain words", () => {
  test("scopes read as what the app may do, and an unknown scope is shown as it is", () => {
    expect(scopeWords(["openid", "offline_access", "billing"])).toEqual([
      "Know it is you",
      "Stay signed in",
      "billing",
    ]);
  });

  test("each way in is named, and an app is named by its own name", () => {
    expect(viaWords("page", "Claude")).toBe("This page");
    expect(viaWords("ask", null)).toBe("Ask in plain words");
    expect(viaWords("app", "Study planner")).toBe("Study planner");
    expect(viaWords("app", null)).toBe("A connected app");
  });

  test("an input reads as names and values, and no input says so", () => {
    expect(inputWords({ query: "evals", kind: "lab" })).toBe('query "evals", kind "lab"');
    expect(inputWords({})).toBe("No input");
  });

  test("the terminal command puts the first required value bare and quotes what needs it", () => {
    expect(cliCommand("search_catalog", { query: "coding agents", kind: "lab" }, "query")).toBe(
      'bun run cli search-catalog "coding agents" --kind lab',
    );
    expect(cliCommand("my_saved_list", {})).toBe("bun run cli my-saved-list");
    expect(cliCommand("search_catalog", { query: 'say "hi"' }, "query")).toBe(
      'bun run cli search-catalog "say \\"hi\\""',
    );
  });

  test("the MCP message carries only the fields that were filled in", () => {
    const message = JSON.parse(mcpCall("search_catalog", { query: "evals", kind: "" }));
    expect(message).toMatchObject({
      method: "tools/call",
      params: { name: "search_catalog", arguments: { query: "evals" } },
    });
    expect(message.params.arguments).not.toHaveProperty("kind");
  });
});

describe("inputs, errors and times in plain words", () => {
  test("a wrong argument reads as a sentence that names the field", () => {
    expect(inputProblem([{ code: "too_small", path: ["query"], message: "", minimum: 2 }])).toBe(
      "query needs at least 2 characters.",
    );
    expect(inputProblem([{ code: "invalid_type", path: ["url"], message: "" }])).toBe("url is required.");
    expect(
      inputProblem([{ code: "invalid_value", path: ["kind"], message: "", values: ["lab", "post"] }]),
    ).toBe("kind must be one of: lab, post.");
  });

  test("a catalog date reads as a day, a month and a year", () => {
    expect(dateWords("2026-11-05")).toBe("5 Nov 2026");
    expect(dateWords("next week")).toBe("next week");
  });

  test("times read at a glance, and older ones as a date", () => {
    const now = new Date("2026-11-26T12:00:00Z");
    const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000);
    expect(whenWords(ago(0), now)).toBe("Just now");
    expect(whenWords(ago(5), now)).toBe("5 min ago");
    expect(whenWords(ago(180), now)).toBe("3 h ago");
    expect(whenWords(ago(30 * 60), now)).toBe("Yesterday");
    expect(whenWords(ago(5 * 24 * 60), now)).toBe("21 Nov 2026");
  });
});
