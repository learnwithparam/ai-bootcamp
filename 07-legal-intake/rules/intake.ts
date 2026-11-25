// What a client sends, what the firm makes of it, and what a lawyer decides. No AI in this file.

export const PRACTICE_AREAS = [
  "employment",
  "tenancy",
  "consumer",
  "contract",
  "family",
  "immigration",
  "criminal",
  "other",
] as const;
export type PracticeArea = (typeof PRACTICE_AREAS)[number];

// The firm takes on these areas only. Anything else is declined with a pointer to get help elsewhere.
export const HANDLED: PracticeArea[] = ["employment", "tenancy", "consumer"];

export type Request = { clientName: string; clientEmail: string; otherParties: string[]; story: string };

// A deadline counts only when the client's own words say it. quote is copied from the story.
export type Deadline = { date: string; quote: string };

export type Assessment = {
  area: PracticeArea;
  summary: string;
  facts: string[];
  deadline: Deadline | null;
  otherParties: string[];
};

// exact: the same name after tidying. possible: one name holds every word of the other, so a person must look.
export type Conflict = {
  name: string;
  record: string;
  role: "client" | "adverse";
  matter: string;
  match: "exact" | "possible";
};

export type Decision = {
  choice: "accept" | "decline";
  note: string;
  clearedPossible: boolean;
  lawyerId: string;
};

export type Status =
  | "assessing"
  | "needs review"
  | "drafting"
  | "letter ready"
  | "sending"
  | "answered"
  | "failed";

export function handles(area: PracticeArea): boolean {
  return HANDLED.includes(area);
}

// The line a lawyer cannot cross. Code checks it in the action and again inside the graph.
export function whyNotAccept(
  assessment: Assessment,
  conflicts: Conflict[],
  clearedPossible: boolean,
): string | null {
  if (!handles(assessment.area)) return `The firm does not take ${assessment.area} matters.`;
  if (conflicts.some((conflict) => conflict.match === "exact"))
    return "A party in this request is on the other side of one of our matters. It must be declined.";
  if (conflicts.length > 0 && !clearedPossible)
    return "Check each possible conflict, then tick that they are different people or companies.";
  return null;
}

// A calendar date such as 2026-12-12. "30 days" or 2026-02-30 is not one.
export function isDate(text: string): boolean {
  const parsed = new Date(`${text}T00:00:00Z`);
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(text) &&
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().startsWith(text)
  );
}

// The model may name a deadline only as a real date, with words from the story. Anything else is dropped.
export function deadlineInStory(deadline: Deadline | null, story: string): Deadline | null {
  if (!deadline?.date || !deadline.quote || !isDate(deadline.date)) return null;
  const flat = (text: string) => text.toLowerCase().replace(/\s+/g, " ").trim();
  const quote = flat(deadline.quote);
  return quote.length >= 8 && flat(story).includes(quote) ? deadline : null;
}

// One request as the screens read it. db/schema.ts checks that its table matches this shape.
export type Intake = Request & {
  id: string;
  status: Status;
  assessment: Assessment | null;
  conflicts: Conflict[];
  decision: Decision | null;
  draft: string | null;
  letter: string | null;
  cost: number;
  error: string | null;
  createdAt: Date;
  answeredAt: Date | null;
};

// The model may add other parties it read in the story, but only names the story really contains.
export function namesInStory(names: string[], story: string): string[] {
  const text = story.toLowerCase();
  return names
    .map((name) => name.trim())
    .filter((name) => name.length > 1 && text.includes(name.toLowerCase()));
}

// What the graph asks the lawyer when it pauses. The screens read the same shape from the row's status.
// refused: the last answer broke a rule, so the graph asks again and says why.
export type Pause =
  | { kind: "review"; refused?: string }
  | { kind: "approve"; draft: string; refused?: string };

export const LETTER_MAX = 6_000;

// A letter must never name a party from the conflict check: that alone tells the client who the firm acts for.
export function whyNotSend(letter: string, conflicts: Conflict[]): string | null {
  const text = letter.trim();
  if (text.length < 40) return "The letter is too short to send.";
  if (text.length > LETTER_MAX) return `Keep the letter under ${LETTER_MAX} characters.`;
  const flat = text.toLowerCase();
  const named = conflicts.find((conflict) => flat.includes(conflict.name.toLowerCase()));
  if (named) return `Take out "${named.name}". A letter never names a party from the conflict check.`;
  return null;
}
