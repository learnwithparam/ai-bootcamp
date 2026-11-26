import { describe, expect, test } from "bun:test";
import { type Email, type Form, formFromEmail, whyNotFill } from "../rules/email";
import { checkForm, nextMove, onPortal, type Seen, sentPage, whyNotStart } from "../rules/run";
import { counts, may, viewOfStatus } from "../rules/team";

// The limits the agent cannot change, and who on the desk may do what. No model, no browser, no database.

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
  goal: "Get my deposit back",
  story: email.body,
};
const LABELS = {
  clientName: "Your full name",
  clientEmail: "Email for our reply",
  otherSide: "The other side",
  goal: "What you want to happen",
  story: "Your message",
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
    const built = formFromEmail(email, {
      clientName: "Kofi Mensah",
      otherSide: "Harbor Lettings",
      goal: "Get my deposit back",
    });
    expect(built.clientEmail).toBe("kofi.mensah@example.com");
    expect(built.story).toBe(email.body);
  });

  test("a name the email does not contain is dropped", () => {
    const built = formFromEmail(email, {
      clientName: "Kofi Annan",
      otherSide: "Harbour Collect Ltd",
      goal: "",
    });
    expect(built.clientName).toBe("Kofi Mensah");
    expect(built.otherSide).toBe("");
  });

  test("a form the portal would refuse is never filled in", () => {
    expect(whyNotFill({ ...form, story: "Call me about my divorce." })).toContain("too short");
    expect(whyNotFill({ ...form, clientName: "" })).toContain("who the client is");
    expect(whyNotFill({ ...form, otherSide: "" })).toContain("who the problem is with");
    expect(whyNotFill({ ...form, goal: "" })).toContain("what the client wants");
    expect(whyNotFill({ ...form, story: "x".repeat(1_501) })).toContain("too long");
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

describe("people on the intake desk", () => {
  test("only the intake lead approves; both roles start, stop and take over", () => {
    expect(may("assistant", "approve")).toBe(false);
    expect(may("lead", "approve")).toBe(true);
    for (const action of ["start", "stop", "take_over"] as const) expect(may("assistant", action)).toBe(true);
  });

  test("each status lands in one view of the inbox", () => {
    expect(viewOfStatus(null)).toBe("inbox");
    expect(viewOfStatus("waiting")).toBe("approvals");
    expect(viewOfStatus("filling")).toBe("working");
    expect(viewOfStatus("taken_over")).toBe("closed");
    const row = {
      id: "",
      fromName: "",
      fromEmail: "",
      subject: "",
      body: "",
      receivedAt: new Date(),
      runId: null,
    };
    expect(
      counts([
        { ...row, status: "submitted" },
        { ...row, status: null },
      ]),
    ).toMatchObject({ sent: 1, inbox: 1 });
  });
});
