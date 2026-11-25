import type { Request } from "./intake";

// Checks what the client typed before anything is saved or sent to a model.

export const STORY_MIN = 80;
export const STORY_MAX = 4_000;
export const INTAKES_PER_EMAIL_PER_DAY = 3;
export const INTAKES_PER_DAY = 200;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function readRequest(form: Record<string, string>): { request?: Request; error?: string } {
  const clientName = form.clientName?.trim() ?? "";
  const clientEmail = form.clientEmail?.trim().toLowerCase() ?? "";
  const story = form.story?.trim() ?? "";
  const otherParties = (form.otherParties ?? "")
    .split(/[\n,;]/)
    .map((name) => name.trim())
    .filter((name) => name.length > 1)
    .slice(0, 10);
  if (clientName.length < 2 || clientName.length > 120) return { error: "Type your full name." };
  if (!EMAIL.test(clientEmail) || clientEmail.length > 200)
    return { error: "Type an email we can reply to." };
  if (story.length < STORY_MIN)
    return { error: `Tell us a little more: at least ${STORY_MIN} characters about what happened.` };
  if (story.length > STORY_MAX)
    return { error: `Keep it under ${STORY_MAX} characters. We will ask for the rest.` };
  return { request: { clientName, clientEmail, otherParties, story } };
}

export function whyNotTake(fromThisEmail: number, today: number): string | null {
  if (fromThisEmail >= INTAKES_PER_EMAIL_PER_DAY)
    return "We already have your requests from today. We will reply to those first.";
  if (today >= INTAKES_PER_DAY)
    return "We have taken all the requests we can read today. Please try again tomorrow.";
  return null;
}
