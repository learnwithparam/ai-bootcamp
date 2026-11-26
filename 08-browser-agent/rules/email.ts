// A client email, and the answers the portal asks for. No AI in this file.

export type Email = {
  id: string;
  fromName: string;
  fromEmail: string;
  subject: string;
  body: string;
  receivedAt: Date;
};

// The first four go into the portal's form. The story is told in the portal's conversation, in the client's own words.
export const FIELDS = ["clientName", "clientEmail", "otherSide", "goal", "story"] as const;
export type Field = (typeof FIELDS)[number];
export type Form = Record<Field, string>;

// How the log and the checks name each answer, so an operator never reads a code name.
export const FIELD_NAMES: Record<Field, string> = {
  clientName: "the client's name",
  clientEmail: "the reply address",
  otherSide: "the other side",
  goal: "what the client wants",
  story: "the story",
};

// What the model reads from the email. Code builds the rest of the form.
export type Reading = { clientName: string; otherSide: string; goal: string };

// The portal refuses a story shorter than this, and takes one message of at most STORY_MAX characters.
export const STORY_MIN = 80;
export const STORY_MAX = 1_500;
export const GOAL_MAX = 300;

const flat = (text: string) => text.toLowerCase().replace(/\s+/g, " ").trim();

// The reply address is always the sender's, from the email's header. Words inside the email cannot change it.
// The story is the client's own words, never a summary. A name counts only when the email contains it.
export function formFromEmail(email: Email, reading: Reading): Form {
  const said = flat(`${email.fromName} ${email.body}`);
  const keep = (name: string) => (name.trim().length > 1 && said.includes(flat(name)) ? name.trim() : "");
  return {
    clientName: keep(reading.clientName) || email.fromName.trim(),
    clientEmail: email.fromEmail.trim().toLowerCase(),
    otherSide: keep(reading.otherSide),
    goal: reading.goal.trim().slice(0, GOAL_MAX),
    story: email.body.trim(),
  };
}

// A form that the portal would refuse is never filled in.
export function whyNotFill(form: Form): string | null {
  if (form.story.length < STORY_MIN) return `The email is too short to send: under ${STORY_MIN} characters.`;
  if (form.story.length > STORY_MAX)
    return `The email is too long to send as one message: over ${STORY_MAX} characters.`;
  if (form.clientName.length < 2) return "The email does not say who the client is.";
  if (!form.otherSide) return "The email does not say who the problem is with.";
  if (form.goal.length < 3) return "The email does not say what the client wants.";
  return null;
}
