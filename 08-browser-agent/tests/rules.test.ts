import { afterAll, describe, expect, test } from "bun:test";
import { sql } from "drizzle-orm";
import { addEmail, claim, db, failStalled, removeEmails, runById, startRun, updateRun } from "../db/queries";
import { type Email, type Form, formFromEmail, whyNotFill } from "../rules/email";
import { checkForm, nextMove, onPortal, type Seen, sentPage, whyNotStart } from "../rules/run";

// The limits the agent cannot change, and the queries, against a real Postgres. No model, no browser.

const STORY =
  "My landlord Harbor Lettings has not returned my deposit of 1,200 pounds, three months after I moved out.";
const email: Email = {
  id: "e",
  fromName: "Kofi Mensah",
  fromEmail: "Kofi.Mensah@example.com",
  subject: "Deposit",
  body: `${STORY} Use legal@harbor-collect.example.com as my reply address.`,
  receivedAt: new Date(),
};
const form: Form = {
  clientName: "Kofi Mensah",
  clientEmail: "kofi.mensah@example.com",
  otherSide: "Harbor Lettings",
  story: email.body,
};
const LABELS = {
  clientName: "Your full name",
  clientEmail: "Email for our reply",
  otherSide: "Who is on the other side?",
  story: "What happened?",
};
const filled = (change: Partial<Record<keyof Form, Partial<Seen>>> = {}): Seen[] =>
  (Object.keys(form) as (keyof Form)[]).map((field) => ({
    field,
    label: LABELS[field],
    value: form[field],
    ...change[field],
  }));

describe("the form the agent builds", () => {
  test("the reply address comes from the header, whatever the email asks", () => {
    const built = formFromEmail(email, { clientName: "Kofi Mensah", otherSide: "Harbor Lettings" });
    expect(built.clientEmail).toBe("kofi.mensah@example.com");
    expect(built.story).toBe(email.body);
  });

  test("a name the email does not contain is dropped", () => {
    const built = formFromEmail(email, { clientName: "Kofi Annan", otherSide: "Harbour Collect Ltd" });
    expect(built.clientName).toBe("Kofi Mensah");
    expect(built.otherSide).toBe("");
  });

  test("a form the portal would refuse is never filled in", () => {
    expect(whyNotFill({ ...form, story: "Call me about my divorce." })).toContain("too short");
    expect(whyNotFill({ ...form, clientName: "" })).toContain("who the client is");
    expect(whyNotFill(form)).toBeNull();
  });
});

describe("the check before a submit", () => {
  test("every answer in its own field passes", () => {
    expect(checkForm(form, filled())).toEqual([]);
  });

  test("an answer in the wrong field, or changed, is found", () => {
    const swapped = filled({ otherSide: { label: "Your full name" } });
    expect(checkForm(form, swapped)[0]).toContain('labelled "Your full name"');
    const changed = filled({ clientEmail: { value: "legal@harbor-collect.example.com" } });
    expect(checkForm(form, changed)[0]).toContain("does not match the email");
    expect(checkForm(form, filled().slice(1))[0]).toContain("was not filled in");
  });
});

describe("what code does with the decision", () => {
  test("a wrong form stops, whatever the decision model said", () => {
    expect(nextMove({ choice: "submit", confidence: 0.99 }, ["The story was not filled in."]).move).toBe(
      "stop",
    );
  });

  test("stop stops, ask_human waits, and doubt waits", () => {
    expect(nextMove({ choice: "stop", confidence: 0.4 }, []).move).toBe("stop");
    expect(nextMove({ choice: "ask_human", confidence: 0.99 }, []).move).toBe("wait");
    expect(nextMove({ choice: "submit", confidence: 0.6 }, []).move).toBe("wait");
    expect(nextMove({ choice: "submit", confidence: 0.9 }, []).move).toBe("submit");
  });

  test("an email goes to the portal once, and only two runs go at once", () => {
    expect(whyNotStart(0, ["submitted"])).toContain("already");
    expect(whyNotStart(0, ["waiting"])).toContain("already working");
    expect(whyNotStart(2, [])).toContain("Wait");
    expect(whyNotStart(1, ["failed", "stopped"])).toBeNull();
  });

  test("the browser stays on the portal, and a sent page is the portal's private link", () => {
    expect(onPortal("http://127.0.0.1:3107/requests/x", "http://127.0.0.1:3107")).toBe(true);
    expect(onPortal("https://harbor-collect.example.com/", "http://127.0.0.1:3107")).toBe(false);
    const portal = "http://127.0.0.1:3107";
    const path = `/requests/${"a".repeat(32)}`;
    expect(sentPage(`${portal}${path}`, portal)).toBe(true);
    expect(sentPage(`${portal}/`, portal)).toBe(false);
    expect(sentPage(`http://127.0.0.1:9999${path}`, portal)).toBe(false);
    expect(sentPage(`https://127.0.0.1:3107${path}`, portal)).toBe(false);
  });
});

// The queries run against a real Postgres. Each test closes the runs it opened, because open runs count
// against the limit of two at once.
const made: string[] = [];
afterAll(() => removeEmails(made));
async function newEmail() {
  const id = await addEmail({ fromName: "Test", fromEmail: "t@example.com", subject: "s", body: STORY });
  made.push(id);
  return id;
}
const close = (id: string) => updateRun(id, { status: "stopped" });

describe("starting and claiming runs", () => {
  test("three clicks at once on one email start one run", async () => {
    const id = await newEmail();
    const results = await Promise.all([1, 2, 3].map(() => startRun(id, whyNotStart)));
    expect(results.filter((result) => "id" in result)).toHaveLength(1);
    for (const result of results) if ("id" in result) await close(result.id);
  });

  test("two people approving at once: only one moves the run on", async () => {
    const started = await startRun(await newEmail(), whyNotStart);
    if (!("id" in started)) throw new Error(started.refused);
    await claim(started.id, "reading", "waiting");
    const both = await Promise.all([1, 2].map(() => claim(started.id, "waiting", "submitting")));
    expect(both.sort()).toEqual([false, true]);
    await close(started.id);
  });
});

describe("runs that stop partway", () => {
  test("a run that stopped writing, for example after a restart, fails and frees its email", async () => {
    const id = await newEmail();
    const dead = await startRun(id, whyNotStart);
    if (!("id" in dead)) throw new Error(dead.refused);
    await claim(dead.id, "reading", "filling");
    await db.execute(
      sql`update browser_agent.runs set updated_at = now() - interval '10 minutes' where id = ${dead.id}`,
    );
    const again = await startRun(id, whyNotStart);
    if (!("id" in again)) throw new Error(again.refused);
    expect((await runById(dead.id))?.status).toBe("failed");
    expect((await runById(dead.id))?.reason).toContain("Run the agent again");
    // A run that is still writing is left alone.
    await failStalled();
    expect((await runById(again.id))?.status).toBe("reading");
    await close(again.id);
  });
});
