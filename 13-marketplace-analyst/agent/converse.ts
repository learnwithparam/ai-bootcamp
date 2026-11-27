import { randomUUID } from "node:crypto";
import { createUIMessageStream, type UIMessage, type UIMessageStreamWriter } from "ai";
import { messagesOf, openConversation, saveMessage } from "../db/queries";
import { recentTurns, type StoredMessage, textOf } from "../rules/message";
import { type AnalystData, type Step, withStep } from "../rules/parts";
import { askAnalyst, type Event } from "./agent";

// One turn of a chat: save the question, stream the graph's work as typed parts, save the answer.
// The route and the seed both call this.

export type AnalystMessage = UIMessage<unknown, AnalystData>;
type Writer = UIMessageStreamWriter<AnalystMessage>;

const FAILED = "The analyst could not answer just now. Try again in a minute.";

// Turns the graph's events into message parts. A part written again with the same id replaces itself.
function screen(writer: Writer) {
  let steps: Step[] = [];
  let costUsd = 0;
  const started = Date.now();
  const timeline = (seconds?: number) =>
    writer.write({ type: "data-timeline", id: "timeline", data: { steps, costUsd, seconds } });
  const tell = (event: Event) => {
    if (event.kind === "step") steps = withStep(steps, event.step);
    if (event.kind === "cost") costUsd = event.costUsd;
    if (event.kind !== "queries") return timeline();
    for (const query of event.queries) writer.write({ type: "data-query", id: query.id, data: query });
  };
  return { tell, finish: () => timeline(Math.round((Date.now() - started) / 1000)) };
}

async function answerInto(writer: Writer, question: string, history: string) {
  const { tell, finish } = screen(writer);
  const done = await askAnalyst(question, history, tell);
  writer.write({ type: "text-start", id: "answer" });
  writer.write({ type: "text-delta", id: "answer", delta: done.answer });
  writer.write({ type: "text-end", id: "answer" });
  writer.write({ type: "data-template", id: "template", data: { template: done.answerTemplate } });
  if (done.chart) writer.write({ type: "data-chart", id: "chart", data: done.chart });
  finish();
}

// Returns null when the conversation belongs to someone else.
export async function converse(conversationId: string, userId: string, message: StoredMessage) {
  const question = textOf(message);
  if (!(await openConversation(conversationId, userId, question))) return null;
  const history = recentTurns(await messagesOf(conversationId, userId));
  await saveMessage(conversationId, message);
  return createUIMessageStream<AnalystMessage>({
    generateId: randomUUID,
    originalMessages: [],
    execute: ({ writer }) => answerInto(writer, question, history),
    onError: (error) => {
      console.error("marketplace-analyst reply failed", error);
      return FAILED;
    },
    onFinish: async ({ responseMessage }) => {
      await saveMessage(conversationId, responseMessage as unknown as StoredMessage);
    },
  });
}
