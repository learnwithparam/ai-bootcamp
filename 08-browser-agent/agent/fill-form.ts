import type { Page, Stagehand } from "@browserbasehq/stagehand";
import { FIELDS, type Field, type Form } from "../rules/email";
import type { Placed, Seen } from "../rules/run";

// What each answer is, in words. Stagehand finds the field on the page that asks for it.
const ASKS_FOR: Record<Field, string> = {
  clientName: "the client's full name",
  clientEmail: "the email address for the reply",
  otherSide: "who is on the other side",
  story: "what happened",
};

// The model picks the field. The answer travels as a variable, so the model never sees or retypes it.
export async function placeAnswer(stagehand: Stagehand, field: Field, value: string): Promise<Placed> {
  const result = await stagehand.act(`Fill the field that asks for ${ASKS_FOR[field]} with %value%`, {
    variables: { value },
  });
  const selector = result.data.actions[0]?.selector;
  if (!result.data.success || !selector) throw new Error(`Could not fill ${field}: ${result.data.message}`);
  return { field, selector };
}

export async function findSendButton(stagehand: Stagehand): Promise<string> {
  const found = await stagehand.observe("Find the button that sends the request");
  const selector = found.data[0]?.selector;
  if (!selector) throw new Error("Could not find the button that sends the request.");
  return selector;
}

// A person's approval replays the same fields with plain code. No model is asked.
export async function replayAnswers(page: Page, form: Form, placed: Placed[]) {
  for (const { field, selector } of placed) await page.locator(selector).fill(form[field]);
}

// The label around a field, when Stagehand's path puts the field straight inside one.
export function labelPath(selector: string): string | null {
  const parent = selector.replace(/\/[^/]+$/, "");
  return /\/label\[\d+\]$/.test(parent) ? parent : null;
}

// Reads each field back from the page with code: its label and what it holds now.
export async function readBack(page: Page, placed: Placed[]): Promise<Seen[]> {
  const seen: Seen[] = [];
  for (const { field, selector } of placed) {
    const around = labelPath(selector);
    const label = around ? await page.locator(around).textContent() : "";
    seen.push({ field, label: label.trim(), value: await page.locator(selector).inputValue() });
  }
  return seen;
}

export function answersToPlace(form: Form): Field[] {
  return FIELDS.filter((field) => form[field]);
}
