import { setTimeout as sleep } from "node:timers/promises";
import { addCost, emailById, Halted, logStep, moveRun, runById, saveRun } from "../db/queries";
import { type Email, FIELD_NAMES, type Form, formFromEmail, whyNotFill } from "../rules/email";
import { ACTIVE, checkForm, nextMove, onPortal, type Placed, sentPage } from "../rules/run";
import { openPortal, picture, type Session } from "./browser";
import { decideSend } from "./decide-send";
import {
  answersSoFar,
  answersToPlace,
  findSendButton,
  placeAnswer,
  readBack,
  replayAnswers,
  waitForAnswer,
} from "./fill-form";
import { PORTAL } from "./portal";
import { readEmail } from "./read-email";

// One run over one email: read it, fill the portal's form and tell its conversation what happened in a real browser,
// check the form, ask the decision model, then send, stop, or wait for a person. Every step is saved, so the screen
// can follow. A person may stop the run or take it over at any step before the send: the agent's next write fails,
// and the run ends there.

export const STOPPED = "The agent stopped. The server log has the details.";

async function step(runId: string, stage: number, text: string, session?: Session) {
  const screen = session ? await picture(session.page) : undefined;
  await logStep(runId, { stage, text, at: new Date().toISOString() }, screen);
}

async function load(runId: string): Promise<{ email: Email; form: Form | null; placed: Placed[] }> {
  const run = await runById(runId);
  const email = run ? await emailById(run.emailId) : null;
  if (!run || !email) throw new Error(`Run ${runId} has no email.`);
  return { email, form: run.form, placed: run.placed };
}

async function readAndFill(runId: string) {
  const { email } = await load(runId);
  await step(runId, 0, `Reading the email from ${email.fromName}.`);
  const { reading, cost } = await readEmail(email);
  await addCost(runId, cost);
  const form = formFromEmail(email, reading);
  const refused = whyNotFill(form);
  if (refused) return moveRun(runId, ACTIVE, "stopped", { form, reason: refused });
  await saveRun(runId, { form, status: "filling" });
  const session = await openPortal();
  try {
    await fillAndDecide(runId, email, form, session);
  } finally {
    await addCost(runId, session.spent.cost);
    await session.close();
  }
}

// The form fields go first. The portal's own assistant never writes over a field the client filled in.
async function fill(runId: string, form: Form, session: Session): Promise<Placed[]> {
  const placed: Placed[] = [];
  for (const field of answersToPlace(form)) {
    if (field === "story") continue;
    placed.push(await placeAnswer(session.stagehand, field, form[field]));
    await step(runId, 2, `Filled in ${FIELD_NAMES[field]}.`, session);
  }
  const answers = await answersSoFar(session.page);
  placed.push(await placeAnswer(session.stagehand, "story", form.story));
  await waitForAnswer(session.page, answers);
  await step(runId, 3, "Sent the client's own words to the portal's conversation.", session);
  return placed;
}

async function fillAndDecide(runId: string, email: Email, form: Form, session: Session) {
  await step(runId, 1, `Opened the intake portal at ${new URL(PORTAL).host}.`, session);
  const placed = await fill(runId, form, session);
  const submitSelector = await findSendButton(session.stagehand, placed);
  await saveRun(runId, { placed, submitSelector, status: "deciding" });
  const seen = await readBack(session.page, placed);
  const problems = checkForm(form, seen);
  await step(runId, 4, problems.length ? problems.join(" ") : "Every answer is in the right place.", session);
  const decision = await decideSend(email, seen);
  await addCost(runId, decision.costUsd);
  const verdict = { choice: decision.choice, confidence: decision.confidence };
  const next = nextMove(verdict, problems);
  await saveRun(runId, { problems, verdict, reason: next.reason });
  await step(runId, 5, next.reason);
  if (next.move === "stop") return moveRun(runId, ["deciding"], "stopped");
  if (next.move === "wait") return moveRun(runId, ["deciding"], "waiting");
  if (!(await moveRun(runId, ["deciding"], "submitting", { decidedBy: "the decision model" }))) return;
  await send(runId, session, submitSelector);
}

// The click that sends is plain code, run only after the checks above. It must land on the portal's sent page.
async function send(runId: string, session: Session, submitSelector: string) {
  const before = await session.page.url();
  if (!onPortal(before, PORTAL)) throw new Error(`The browser left the portal: ${before}`);
  await session.page.locator(submitSelector).click();
  let now = await session.page.url();
  for (let wait = 0; wait < 40 && !sentPage(now, PORTAL); wait++) {
    await sleep(500);
    now = await session.page.url();
  }
  if (!sentPage(now, PORTAL)) {
    await step(runId, 6, "The portal did not accept the request.", session);
    throw new Error(`The portal did not accept the request from run ${runId}.`);
  }
  await step(runId, 6, "Sent. The portal made the client's private link.", session);
  await moveRun(runId, ["submitting"], "submitted", { requestUrl: now });
}

// A person approved a run that waited. The same answers go into the same places with plain code, then the same checks.
async function replayAndSend(runId: string) {
  const { form, placed } = await load(runId);
  const submitSelector = (await runById(runId))?.submitSelector;
  if (!form || !submitSelector) throw new Error(`Run ${runId} has no form to send.`);
  const session = await openPortal();
  try {
    await replayAnswers(session.page, form, placed);
    const problems = checkForm(form, await readBack(session.page, placed));
    const text = problems.length
      ? problems.join(" ")
      : "Filled in again. Every answer is in the right place.";
    await step(runId, 4, text, session);
    if (problems.length) return moveRun(runId, ["submitting"], "stopped", { reason: problems.join(" ") });
    await send(runId, session, submitSelector);
  } finally {
    await addCost(runId, session.spent.cost);
    await session.close();
  }
}

// Any error ends the run as failed. The full error goes to the server log; the screen shows a plain line.
// A run a person stopped or took over ends quietly: that is not a failure.
async function guarded(runId: string, work: (runId: string) => Promise<unknown>) {
  try {
    await work(runId);
  } catch (error) {
    if (error instanceof Halted) return;
    console.error(`Browser agent run ${runId} failed:`, error);
    const message = error instanceof Error ? error.message : String(error);
    await moveRun(runId, ACTIVE, "failed", { reason: STOPPED, error: message });
  }
}

export const runEmail = (runId: string) => guarded(runId, readAndFill);
export const sendApproved = (runId: string) => guarded(runId, replayAndSend);
