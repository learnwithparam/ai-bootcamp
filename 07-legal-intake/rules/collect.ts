import { type Deadline, deadlineInStory, isDate, namesInStory, type Request, type Turn } from "./intake";

// The intake form the client sees beside the conversation. The agent fills it from the client's words,
// the client can change any field, and only the client sends it. No AI in this file.

export type Draft = {
  clientName: string;
  clientEmail: string;
  otherParties: string[];
  keyDate: Deadline | null;
  goal: string;
};
export type FieldName = keyof Draft;

export const FIELDS: { name: FieldName; label: string; required: boolean }[] = [
  { name: "clientName", label: "Your name", required: true },
  { name: "clientEmail", label: "Email for our reply", required: true },
  { name: "otherParties", label: "The other side", required: true },
  { name: "keyDate", label: "A date that matters", required: false },
  { name: "goal", label: "What you want to happen", required: true },
];

export const EMPTY_DRAFT: Draft = {
  clientName: "",
  clientEmail: "",
  otherParties: [],
  keyDate: null,
  goal: "",
};

export const MESSAGE_MAX = 1_500;
export const TURNS_MAX = 12;
export const TURNS_PER_DAY = 3_000;
export const STORY_MIN = 80;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function clientWords(transcript: Turn[]): string {
  return transcript
    .filter((turn) => turn.from === "client")
    .map((turn) => turn.text.trim())
    .join("\n\n");
}

function isFilled(draft: Draft, name: FieldName): boolean {
  const value = draft[name];
  if (Array.isArray(value)) return value.length > 0;
  return Boolean(value);
}

export function missing(draft: Draft): FieldName[] {
  return FIELDS.filter((field) => field.required && !isFilled(draft, field.name)).map((field) => field.name);
}

// What the model read, kept only where the client's words back it up.
// A name or email the client never typed is dropped, so the agent cannot invent who is asking.
export function grounded(read: Partial<Draft>, words: string): Partial<Draft> {
  const text = words.toLowerCase();
  const kept: Partial<Draft> = {};
  if (read.clientName && text.includes(read.clientName.toLowerCase())) kept.clientName = read.clientName;
  const email = read.clientEmail?.toLowerCase();
  if (email && EMAIL.test(email) && text.includes(email)) kept.clientEmail = email;
  const parties = namesInStory(read.otherParties ?? [], words);
  if (parties.length > 0) kept.otherParties = parties;
  const keyDate = deadlineInStory(read.keyDate ?? null, words);
  if (keyDate) kept.keyDate = keyDate;
  if (read.goal?.trim()) kept.goal = read.goal.trim().slice(0, 300);
  return kept;
}

// The client's own edit always wins: the agent never writes over a field the client changed.
export function merge(draft: Draft, read: Partial<Draft>, edited: FieldName[]): Draft {
  const next = { ...draft };
  for (const field of FIELDS) {
    const value = read[field.name];
    if (value === undefined || edited.includes(field.name)) continue;
    Object.assign(next, { [field.name]: value });
  }
  return next;
}

// The form as the page sent it. Anything that is not the right shape is dropped, never trusted.
export function tidyDraft(raw: unknown): Draft {
  const value = (raw ?? {}) as Record<string, unknown>;
  const text = (field: unknown, max: number) => (typeof field === "string" ? field.slice(0, max) : "");
  const date = value.keyDate as Record<string, unknown> | null | undefined;
  const parties = Array.isArray(value.otherParties) ? value.otherParties : [];
  return {
    clientName: text(value.clientName, 120),
    clientEmail: text(value.clientEmail, 200),
    otherParties: parties
      .map((name) => text(name, 120).trim())
      .filter(Boolean)
      .slice(0, 10),
    keyDate:
      date && isDate(text(date.date, 10))
        ? { date: text(date.date, 10), quote: text(date.quote, 300) }
        : null,
    goal: text(value.goal, 300),
  };
}

export const tidyEdited = (raw: unknown): FieldName[] =>
  Array.isArray(raw) ? FIELDS.map((field) => field.name).filter((name) => raw.includes(name)) : [];

// How many messages one visitor may send in 24 hours, from LEGAL_INTAKE_TURNS_PER_VISITOR.
// A missing or broken value is an error, never a silent default.
export function readTurnsPerVisitor(settings: Record<string, string | undefined>): number {
  const value = Number(settings.LEGAL_INTAKE_TURNS_PER_VISITOR);
  if (!Number.isInteger(value) || value <= 0)
    throw new Error("Set LEGAL_INTAKE_TURNS_PER_VISITOR to a whole number above 0.");
  return value;
}

// Checked before any model call. visitorToday and today count the turns already taken.
export function whyNotTalk(
  message: string,
  transcript: Turn[],
  counts: { visitorToday: number; today: number; perVisitor: number },
) {
  const { visitorToday, today, perVisitor } = counts;
  if (!message.trim()) return "Type a message first.";
  if (message.length > MESSAGE_MAX) return `Keep each message under ${MESSAGE_MAX} characters.`;
  if (transcript.filter((turn) => turn.from === "client").length >= TURNS_MAX)
    return "That is all we need to ask. Check the form, then send it.";
  if (visitorToday >= perVisitor)
    return "You have sent a lot of messages today. Send the form as it is, or come back tomorrow.";
  if (today >= TURNS_PER_DAY) return "We are not taking more messages today. Please come back tomorrow.";
  return null;
}

// The form as sent. It checks every field again on the server, whatever the page showed.
export function readDraft(draft: Draft, transcript: Turn[]): { request?: Request; error?: string } {
  const clientName = draft.clientName.trim();
  const clientEmail = draft.clientEmail.trim().toLowerCase();
  const story = clientWords(transcript);
  if (clientName.length < 2 || clientName.length > 120) return { error: "Add your full name." };
  if (!EMAIL.test(clientEmail) || clientEmail.length > 200) return { error: "Add an email we can reply to." };
  if (draft.otherParties.length === 0) return { error: "Add who the problem is with." };
  if (draft.goal.trim().length < 3) return { error: "Add what you want to happen." };
  if (story.length < STORY_MIN) return { error: "Tell us a little more about what happened first." };
  const keyDate = draft.keyDate && isDate(draft.keyDate.date) ? draft.keyDate : null;
  const otherParties = draft.otherParties.map((name) => name.trim().slice(0, 120)).filter(Boolean);
  return {
    request: {
      clientName,
      clientEmail,
      otherParties: otherParties.slice(0, 10),
      keyDate,
      goal: draft.goal.trim().slice(0, 300),
      story,
      transcript: transcript.slice(0, TURNS_MAX * 2),
    },
  };
}
