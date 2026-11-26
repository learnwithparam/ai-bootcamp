import type { Page, Stagehand } from "@browserbasehq/stagehand";
import { FIELDS, type Field, type Form } from "../rules/email";
import type { Placed } from "../rules/run";

// What each answer is, in words. Stagehand finds the field on the page that asks for it.
// The story goes into the portal's conversation, and the other side is added as a name, so both press a button after.
const ASKS_FOR: Record<Field, { fill: string; press?: string }> = {
  clientName: { fill: "the field for the client's own full name" },
  clientEmail: { fill: "the field for the email address the firm replies to" },
  otherSide: {
    fill: "the box for adding a name to who is on the other side",
    press: "the Add button next to the box for the other side",
  },
  goal: { fill: "the field for what the client wants to happen" },
  story: {
    fill: "the message box of the conversation",
    press:
      "the button that sends the message in the conversation, not the button that sends the whole request",
  },
};

async function act(stagehand: Stagehand, instruction: string, value?: string): Promise<string> {
  const result = await stagehand.act(instruction, value === undefined ? {} : { variables: { value } });
  const selector = result.data.actions[0]?.selector;
  if (!result.data.success || !selector) throw new Error(`Could not ${instruction}: ${result.data.message}`);
  return selector;
}

// The model picks the field. The answer travels as a variable, so the model never sees or retypes it.
export async function placeAnswer(stagehand: Stagehand, field: Field, value: string): Promise<Placed> {
  const asks = ASKS_FOR[field];
  const selector = await act(stagehand, `Fill ${asks.fill} with %value%`, value);
  if (!asks.press) return { field, selector };
  return { field, selector, press: await act(stagehand, `Click ${asks.press}`) };
}

// The portal turned a message away, for example at its daily limit. The run stops with the portal's own words.
export class PortalRefused extends Error {}

// The portal's assistant answers each message. The agent waits for that answer, or for the portal's error.
export async function waitForAnswer(page: Page, answersBefore: number) {
  await page.waitForFunction(
    (before: number) =>
      document.querySelectorAll(".turn-agent:not(.turn-typing)").length > before ||
      Boolean(document.querySelector(".conversation [role=alert]")),
    answersBefore,
    { timeout: 90_000 },
  );
  const refused = await page.evaluate(
    () => document.querySelector(".conversation [role=alert]")?.textContent?.trim() ?? "",
  );
  if (refused) throw new PortalRefused(`The portal turned the message away: ${refused}`);
}

export const answersSoFar = (page: Page) =>
  page.evaluate(() => document.querySelectorAll(".turn-agent:not(.turn-typing)").length);

export async function findSendButton(stagehand: Stagehand, placed: Placed[]): Promise<string> {
  const found = await stagehand.observe(
    "Find the button under the request form that sends the whole request",
  );
  const selector = found.data[0]?.selector;
  if (!selector) throw new Error("Could not find the button that sends the request.");
  if (placed.some((each) => each.press === selector))
    throw new Error("The button found sends a message, not the request.");
  return selector;
}

// A person's approval replays the same fields and buttons with plain code. No model is asked.
export async function replayAnswers(page: Page, form: Form, placed: Placed[]) {
  for (const { field, selector, press } of placed) {
    const answers = await answersSoFar(page);
    await page.locator(selector).fill(form[field]);
    if (press) await page.locator(press).click();
    if (field === "story") await waitForAnswer(page, answers);
  }
}

export function answersToPlace(form: Form): Field[] {
  return FIELDS.filter((field) => form[field]);
}

export { readBack } from "./read-back";
