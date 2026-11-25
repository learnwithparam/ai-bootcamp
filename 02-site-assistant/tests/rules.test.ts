import { afterAll, describe, expect, test } from "bun:test";
import { eq, like } from "drizzle-orm";
import {
  addToSupportTeam,
  customerOf,
  db,
  isOnSupportTeam,
  markAnswered,
  openTicket,
  recordTurn,
  savePage,
  searchSections,
  usageFor,
} from "../db/queries";
import { pages, supportTeam, tickets, turns } from "../db/schema";
import { checkCitations, type Source } from "../rules/citations";
import { checkLimits, readLimits } from "../rules/limits";
import { formatPrice } from "../rules/price";
import { htmlSections, linkedPages, markdownSections } from "../rules/sections";

// The rules, with no model. The database tests use the seeded Postgres: run `bun run setup` first.

const TEST_VISITOR = `test:${crypto.randomUUID()}`;
const TEST_ACCOUNT = `test-account-${crypto.randomUUID()}`;
const TEST_PAGE = `https://test.invalid/${crypto.randomUUID()}`;

afterAll(async () => {
  await db.delete(turns).where(eq(turns.visitor, TEST_VISITOR));
  await db.delete(supportTeam).where(eq(supportTeam.userId, TEST_ACCOUNT));
  await db.delete(tickets).where(like(tickets.email, "rules-test-%"));
  await db.delete(pages).where(eq(pages.url, TEST_PAGE));
});

describe("cutting a page into sections", () => {
  const html = `<html><head><title>Pro | learnwithparam</title></head><body>
    <nav>Menu text that is not part of the page</nav>
    <main><h1>Pro</h1><p>Every Lightning session as a video course, for a year of learning.</p>
    <script>window.tracking = true</script>
    <h2>Price</h2><p>$149 a year.</p><ul><li>Cancel</li><li>any time</li></ul>
    <p><a href="/faq">Read</a><span>the FAQ</span> for more about what Pro adds to the free courses.</p></main></body></html>`;

  test("a new section starts at each heading, and only <main> is read", async () => {
    const page = await htmlSections(html);
    expect(page.title).toBe("Pro | learnwithparam");
    expect(page.sections.map((section) => section.heading)).toEqual(["Pro", "Price"]);
    expect(JSON.stringify(page)).not.toContain("Menu text");
    expect(JSON.stringify(page)).not.toContain("tracking");
  });

  test("words in separate tags stay separate words", async () => {
    const page = await htmlSections(html);
    const price = page.sections[1]?.body ?? "";
    expect(price).toContain("Cancel\nany time");
    expect(price).toContain("Read the FAQ");
  });

  test("llms.txt splits at each ## heading and lists only the site's own links", () => {
    const markdown =
      "# learnwithparam\n\n## Labs\nHands-on labs for engineers who build AI products every week.\n" +
      "- [Pro](https://www.learnwithparam.com/pro)\n- [Maven](https://maven.com/learnwithparam)\n";
    const page = markdownSections(markdown);
    expect(page.sections.map((section) => section.heading)).toContain("Labs");
    expect(linkedPages(markdown, "https://www.learnwithparam.com")).toEqual([
      "https://www.learnwithparam.com/pro",
    ]);
  });
});

describe("the limits", () => {
  const limits = readLimits({ SITE_ASSISTANT_PER_MINUTE: "5", SITE_ASSISTANT_DAILY_CAP_USD: "2" });

  test("a visitor under both limits gets an answer", () => {
    expect(checkLimits({ questionsLastMinute: 4, spentTodayUsd: 1.99 }, limits)).toEqual({ open: true });
  });

  test("too many questions in a minute is a 429", () => {
    expect(checkLimits({ questionsLastMinute: 5, spentTodayUsd: 0 }, limits)).toMatchObject({ status: 429 });
  });

  test("the spend cap is checked first and turns the assistant off for everyone", () => {
    expect(checkLimits({ questionsLastMinute: 9, spentTodayUsd: 2 }, limits)).toMatchObject({ status: 503 });
  });

  test("a missing limit is an error, never a silent default", () => {
    expect(() => readLimits({})).toThrow("SITE_ASSISTANT_PER_MINUTE");
  });
});

describe("checking citations", () => {
  const source = (number: number, url: string): Source => ({ number, url, title: "", heading: "", body: "" });
  const shown = [source(1, "/pro"), source(2, "/pro"), source(3, "/faq")];

  test("a number the assistant was never shown is a bad citation", () => {
    const check = checkCitations("Pro is $149 a year [1][2]. It has a free trial [7].", shown);
    expect(check).toEqual({ cited: [1, 2], bad: [7], citedPages: ["/pro"] });
  });
});

describe("small rules", () => {
  test("a Stripe price reads the way the site writes it", () => {
    expect(formatPrice(14_900, "usd", "year")).toBe("$149 a year");
    expect(formatPrice(4_950, "usd", "month")).toBe("$49.50 a month");
  });
});

describe("the database", () => {
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

  test("two people cannot both answer the same ticket", async () => {
    const id = await openTicket({
      email: `rules-test-${crypto.randomUUID()}@example.com`,
      summary: "Refund",
      conversation: [],
    });
    expect(await markAnswered(id, "first@example.com")).toBe(true);
    expect(await markAnswered(id, "second@example.com")).toBe(false);
  });
});

// Access is keyed by account, never by email: anyone can sign up with an email they do not own.
describe("accounts", () => {
  test("an account reads the support queue only after it is added, by account", async () => {
    expect(await isOnSupportTeam(TEST_ACCOUNT)).toBe(false);
    await addToSupportTeam(TEST_ACCOUNT);
    expect(await isOnSupportTeam(TEST_ACCOUNT)).toBe(true);
  });

  test("an account that never checked out has no Stripe customer", async () => {
    expect(await customerOf(TEST_ACCOUNT)).toBeNull();
  });
});
