import { EventType } from "@ag-ui/core";
import { EventEncoder } from "@ag-ui/encoder";
import { type Emit, personalize } from "../../../agent/agent";
import { reserveAsk, settleAsk } from "../../../db/asks";
import { allProducts, enabledTypes, savePage, savePersonalization } from "../../../db/queries";
import { shopperOf } from "../../shopper";
import { answerBasket } from "./basket";
import { RunInput, type Turn, turnOf } from "./input";

// The page's one agent endpoint, spoken in AG-UI: the page posts a run, this answers with a stream of events.
// The shopper's words go to the model; their answer to a basket card never does.

async function ask(
  turn: Extract<Turn, { kind: "ask" }>,
  input: RunInput,
  owner: string,
  emit: Emit,
  signal: AbortSignal,
) {
  const reserved = await reserveAsk(owner);
  if ("blocked" in reserved) throw new ShopperError(reserved.blocked);
  const started = Date.now();
  const [products, enabled] = await Promise.all([allProducts(), enabledTypes()]);
  const ask = { said: turn.said, profile: input.state.profile, products, enabled };
  const outcome = await personalize(ask, emit, signal);
  await settleAsk(reserved.id, outcome.cost);
  const { profile, sections, reply, removed, dropped, proposal, toolCallId, cost } = outcome;
  await savePage({ owner, profile, sections });
  const basketStatus = toolCallId ? "waiting" : "none";
  const seconds = (Date.now() - started) / 1000;
  await savePersonalization({
    owner,
    said: turn.said,
    reply,
    profile,
    sections,
    removed,
    dropped,
    proposal,
    toolCallId,
    basket: basketStatus,
    costUsd: cost,
    seconds,
  });
}

// A message meant for the shopper, as opposed to a failure they should never see the inside of.
class ShopperError extends Error {}

async function run(input: RunInput, owner: string, emit: Emit, signal: AbortSignal) {
  const turn = turnOf(input);
  if (turn.kind === "bad") throw new ShopperError(turn.why);
  if (turn.kind === "answer") return answerBasket(turn, owner, emit);
  return ask(turn, input, owner, emit, signal);
}

async function bodyOf(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch (error) {
    console.error("A run arrived that was not JSON.", error);
    return null;
  }
}

export async function POST(request: Request) {
  const parsed = RunInput.safeParse(await bodyOf(request));
  if (!parsed.success) return new Response("Not a run this shop can answer.", { status: 400 });
  const input = parsed.data;
  const shopper = await shopperOf(request);
  const encoder = new EventEncoder({ accept: request.headers.get("accept") ?? undefined });
  const stream = new ReadableStream({
    async start(controller) {
      const emit: Emit = (event) =>
        controller.enqueue(new TextEncoder().encode(encoder.encode(event as never)));
      emit({ type: EventType.RUN_STARTED, threadId: input.threadId, runId: input.runId });
      try {
        await run(input, shopper.owner, emit, request.signal);
        emit({ type: EventType.RUN_FINISHED, threadId: input.threadId, runId: input.runId });
      } catch (error) {
        if (!(error instanceof ShopperError)) console.error("The storefront run failed.", error);
        const message =
          error instanceof ShopperError
            ? error.message
            : "Your page could not be changed just now. Try again in a moment.";
        emit({ type: EventType.RUN_ERROR, message });
      }
      controller.close();
    },
  });
  const headers: Record<string, string> = {
    "content-type": encoder.getContentType(),
    "cache-control": "no-cache",
  };
  if (shopper.setCookie) headers["set-cookie"] = shopper.setCookie;
  return new Response(stream, { headers });
}
