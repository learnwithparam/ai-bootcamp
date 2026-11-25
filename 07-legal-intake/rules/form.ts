// How many requests the firm takes. Checked when a client sends the form, inside the same transaction.

export const INTAKES_PER_EMAIL_PER_DAY = 3;
export const INTAKES_PER_DAY = 200;

export function whyNotTake(fromThisEmail: number, today: number): string | null {
  if (fromThisEmail >= INTAKES_PER_EMAIL_PER_DAY)
    return "We already have your requests from today. We will reply to those first.";
  if (today >= INTAKES_PER_DAY)
    return "We have taken all the requests we can read today. Please try again tomorrow.";
  return null;
}
