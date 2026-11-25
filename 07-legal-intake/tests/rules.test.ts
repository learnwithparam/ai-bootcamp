import { afterAll, describe, expect, test } from "bun:test";
import { claim, intakeById, intakeByToken, removeIntakes, takeRequest } from "../db/queries";
import { findConflicts, type PartyRecord } from "../rules/conflicts";
import { readRequest, whyNotTake } from "../rules/form";
import { type Assessment, deadlineInStory, namesInStory, whyNotAccept, whyNotSend } from "../rules/intake";

// The business rules and the queries, against a real Postgres. No model.

const RECORDS: PartyRecord[] = [
  { name: "Northwind Logistics Ltd", role: "client", matter: "M-1" },
  { name: "Priya Raman", role: "client", matter: "M-2" },
  { name: "Daniel Okafor", role: "adverse", matter: "M-3" },
  { name: "Marcus Bell", role: "client", matter: "M-4" },
];

const STORY =
  "My landlord Greenway Homes kept my deposit of 900 pounds. They say I must leave by 15 January 2027 or they will go to court.";

describe("conflict check", () => {
  test("a client who was on the other side of our matter is an exact conflict", () => {
    const found = findConflicts("Daniel Okafor", [], RECORDS);
    expect(found).toEqual([
      { name: "Daniel Okafor", record: "Daniel Okafor", role: "adverse", matter: "M-3", match: "exact" },
    ]);
  });

  test("acting against our own client is a conflict, whatever the spelling of Ltd, case or accents", () => {
    expect(findConflicts("Ana Silva", ["NORTHWIND LOGISTICS"], RECORDS)[0]?.match).toBe("exact");
    expect(findConflicts("Ana Silva", ["Priyá Raman"], RECORDS)[0]?.match).toBe("exact");
  });

  test("a longer name holding every word is possible, one shared word is nothing", () => {
    expect(findConflicts("Ana Silva", ["Priya S. Raman"], RECORDS)[0]?.match).toBe("possible");
    expect(findConflicts("Ana Silva", ["Bell"], RECORDS)).toEqual([]);
    expect(findConflicts("Marcus Bell", [], RECORDS)).toEqual([]);
  });
});

describe("what a lawyer may decide", () => {
  const tenancy: Assessment = { area: "tenancy", summary: "s", facts: [], deadline: null, otherParties: [] };
  const exact = findConflicts("Daniel Okafor", [], RECORDS);
  const possible = findConflicts("Ana Silva", ["Priya S. Raman"], RECORDS);

  test("an exact conflict can never be accepted, even when ticked as checked", () => {
    expect(whyNotAccept(tenancy, exact, true)).toContain("must be declined");
  });

  test("a possible conflict is accepted only after the lawyer clears it", () => {
    expect(whyNotAccept(tenancy, possible, false)).toContain("Check each possible conflict");
    expect(whyNotAccept(tenancy, possible, true)).toBeNull();
  });

  test("an area the firm does not take is refused", () => {
    expect(whyNotAccept({ ...tenancy, area: "criminal" }, [], true)).toContain("does not take criminal");
  });

  test("a letter must have real words and a limit", () => {
    const fine = `Dear Ana, ${"we have read your request. ".repeat(3)}`;
    expect(whyNotSend("Dear Ana", [])).toContain("too short");
    expect(whyNotSend("x".repeat(7_000), [])).toContain("under");
    expect(whyNotSend(fine, [])).toBeNull();
    expect(whyNotSend(fine, exact)).toBeNull();
  });

  test("a letter that names a party from the conflict check is never sent", () => {
    expect(whyNotSend(`Dear Ana, ${"we cannot act against daniel okafor. ".repeat(2)}`, exact)).toContain(
      "Take out",
    );
  });
});

describe("what the model may add", () => {
  test("a deadline counts only when its quote is in the story", () => {
    const real = { date: "2027-01-15", quote: "leave by 15 January 2027" };
    expect(deadlineInStory(real, STORY)).toEqual(real);
    expect(deadlineInStory({ date: "2027-01-01", quote: "court on 1 January" }, STORY)).toBeNull();
    expect(deadlineInStory({ date: "2027-01-15", quote: "2027" }, STORY)).toBeNull();
    expect(deadlineInStory({ date: "15 January", quote: "leave by 15 January 2027" }, STORY)).toBeNull();
    expect(deadlineInStory({ date: "2027-02-30", quote: "leave by 15 January 2027" }, STORY)).toBeNull();
  });

  test("a party name counts only when the story contains it", () => {
    expect(namesInStory(["Greenway Homes", "Daniel Okafor"], STORY)).toEqual(["Greenway Homes"]);
  });
});

describe("the public form", () => {
  test("a request is read and tidied, and a thin one is refused", () => {
    const { request } = readRequest({
      clientName: " Ana ",
      clientEmail: "ANA@x.org",
      otherParties: "A Ltd, B;C",
      story: STORY,
    });
    expect(request?.clientEmail).toBe("ana@x.org");
    expect(request?.otherParties).toEqual(["A Ltd"]);
    expect(readRequest({ clientName: "Ana", clientEmail: "ana@x.org", story: "help" }).error).toContain(
      "at least",
    );
    expect(readRequest({ clientName: "Ana", clientEmail: "nope", story: STORY }).error).toContain("email");
  });

  test("three a day from one email, and a cap for everyone", () => {
    expect(whyNotTake(2, 10)).toBeNull();
    expect(whyNotTake(3, 10)).toContain("already have");
    expect(whyNotTake(0, 200)).toContain("tomorrow");
  });
});

describe("queries", () => {
  const made: string[] = [];
  afterAll(() => removeIntakes(made));
  const request = (email: string) => ({
    clientName: "Test Client",
    clientEmail: email,
    otherParties: [],
    story: STORY,
  });

  test("only the private link finds a request, and the token is not stored", async () => {
    const taken = await takeRequest(request(`t-${crypto.randomUUID()}@example.com`), whyNotTake);
    if (!("id" in taken)) throw new Error(taken.refused);
    made.push(taken.id);
    expect((await intakeByToken(taken.token))?.id).toBe(taken.id);
    expect(await intakeByToken(`${taken.token.slice(0, -1)}A`)).toBeNull();
    expect(JSON.stringify(await intakeById(taken.id))).not.toContain(taken.token);
  });

  test("four requests at once from one email: three are taken, one is refused", async () => {
    const email = `race-${crypto.randomUUID()}@example.com`;
    const results = await Promise.all([1, 2, 3, 4].map(() => takeRequest(request(email), whyNotTake)));
    for (const result of results) if ("id" in result) made.push(result.id);
    expect(results.filter((result) => "refused" in result)).toHaveLength(1);
  });

  test("two lawyers pressing at once: only one moves the request on", async () => {
    const taken = await takeRequest(request(`c-${crypto.randomUUID()}@example.com`), whyNotTake);
    if (!("id" in taken)) throw new Error(taken.refused);
    made.push(taken.id);
    await claim(taken.id, "assessing", "needs review");
    const both = await Promise.all([1, 2].map(() => claim(taken.id, "needs review", "drafting")));
    expect(both.sort()).toEqual([false, true]);
  });
});
