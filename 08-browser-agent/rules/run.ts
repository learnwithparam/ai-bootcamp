import { type Email, FIELD_NAMES, type Field, type Form } from "./email";

// One run of the agent over one email, and the limits on what it may do. No AI in this file.

export type Status =
  | "reading"
  | "filling"
  | "deciding"
  | "waiting"
  | "submitting"
  | "submitted"
  | "stopped"
  | "failed";

// Each email in the inbox, with the status of its latest run.
export type InboxRow = Email & { runId: string | null; status: Status | null };

export const ACTIVE: Status[] = ["reading", "filling", "deciding", "submitting"];

// A run writes every few seconds. One that has not written for this long died with its server, so it is marked failed
// and the email can run again.
export const STALLED_AFTER_MINUTES = 3;

export function stalledReason(status: Status): string {
  if (status === "submitting")
    return "The run stopped while sending, for example because the server restarted. The portal may already have the request.";
  return "The run stopped partway, for example because the server restarted. Run the agent again.";
}

// The plan the screen shows next to the browser. Each step in the log points at one of these.
export const PLAN = [
  "Read the email",
  "Open the intake portal",
  "Fill in the form",
  "Check the form",
  "Ask the decision model",
  "Send the request",
] as const;

export type Step = { stage: number; text: string; at: string };

export type Choice = "submit" | "stop" | "ask_human";
export type Verdict = { choice: Choice; confidence: number };

// Where the agent typed each answer, so a person's approval replays it without a model.
export type Placed = { field: Field; selector: string };

// What a form field holds after filling, read back by code, not by the model.
export type Seen = { field: Field; label: string; value: string };

// Below this the decision model is not sure enough, and a person decides.
// Measured on the sample inbox: a clear request scored 0.67 to 0.8, a thin one about 0.5. Below the bar, a person approves.
export const SURE_ENOUGH = 0.75;
export const MOST_AT_ONCE = 2;

// Each answer must sit in the field whose label asks for it.
export const LABELS: Record<Field, RegExp> = {
  clientName: /name/i,
  clientEmail: /email/i,
  otherSide: /other side/i,
  story: /what happened/i,
};

const flat = (text: string) => text.replace(/\s+/g, " ").trim();
const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

// The check before any submit: every answer is in the right field, exactly as intended.
export function checkForm(intended: Form, seen: Seen[]): string[] {
  const problems: string[] = [];
  for (const [field, value] of Object.entries(intended) as [Field, string][]) {
    if (!value) continue;
    const found = seen.find((entry) => entry.field === field);
    if (!found) problems.push(`${capital(FIELD_NAMES[field])} was not filled in.`);
    else if (!LABELS[field].test(found.label))
      problems.push(`${capital(FIELD_NAMES[field])} went into the field labelled "${found.label}".`);
    else if (flat(found.value) !== flat(value))
      problems.push(`${capital(FIELD_NAMES[field])} does not match the email.`);
  }
  return problems;
}

export type Move = { move: "submit" | "stop" | "wait"; reason: string };

// The decision model chooses, but code has the last word: a wrong form is never sent, and a doubt waits for a person.
export function nextMove(verdict: Verdict, problems: string[]): Move {
  if (problems.length > 0) return { move: "stop", reason: `The form is wrong: ${problems.join(" ")}` };
  if (verdict.choice === "stop") return { move: "stop", reason: "The decision model said not to send it." };
  if (verdict.choice === "ask_human")
    return { move: "wait", reason: "The decision model asked for a person." };
  if (verdict.confidence < SURE_ENOUGH)
    return {
      move: "wait",
      reason: `The decision model was only ${Math.round(verdict.confidence * 100)}% sure.`,
    };
  return { move: "submit", reason: `The decision model was ${Math.round(verdict.confidence * 100)}% sure.` };
}

// An email is sent to the portal at most once. Each run holds a real browser, so only a few go at once.
export function whyNotStart(active: number, earlier: Status[]): string | null {
  if (earlier.includes("submitted")) return "This email was sent to the portal already.";
  if (earlier.some((status) => status === "waiting" || ACTIVE.includes(status)))
    return "The agent is already working on this email.";
  if (active >= MOST_AT_ONCE) return `${MOST_AT_ONCE} runs are going already. Wait for one to finish.`;
  return null;
}

// The browser may open the portal and nothing else.
export function onPortal(url: string, portal: string): boolean {
  return URL.canParse(url) && new URL(url).origin === new URL(portal).origin;
}

// After a submit the portal moves to the client's private page. Its origin must be the portal's own, so a page
// on another port or scheme with the same path never counts as sent.
export function sentPage(url: string, portal: string): boolean {
  return onPortal(url, portal) && /^\/requests\/[\w-]{32}$/.test(new URL(url).pathname);
}

export type Run = {
  id: string;
  emailId: string;
  status: Status;
  form: Form | null;
  placed: Placed[];
  submitSelector: string | null;
  problems: string[];
  verdict: Verdict | null;
  reason: string | null;
  decidedBy: string | null;
  requestUrl: string | null;
  steps: Step[];
  cost: number;
  error: string | null;
  createdAt: Date;
  finishedAt: Date | null;
  updatedAt: Date;
};
