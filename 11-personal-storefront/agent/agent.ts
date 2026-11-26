import { EventType } from "@ag-ui/core";
import type { Product } from "../rules/catalog";
import { checkSection, shelfOf } from "../rules/layout";
import type { Profile } from "../rules/profile";
import type { Removed, Section, SectionType } from "../rules/sections";
import { addSection, type Patch, type ShopState, setBasket, setWorking } from "../rules/state";
import { fillBasket } from "./basket";
import { asRequest, layOut } from "./sections";
import { understand } from "./understand";

// One ask from a shopper, as AG-UI events: the reply, the page section by section, and a basket to approve.
// The route sends each event to the browser as it happens. Nothing here trusts the model with a product,
// a price or an allergen: every section goes through rules/layout.ts before it is sent.

export type Emit = (event: { type: EventType } & Record<string, unknown>) => void;
export type Ask = {
  said: string;
  profile: Profile;
  products: Product[];
  enabled: SectionType[];
};
export type Outcome = {
  profile: Profile;
  reply: string;
  sections: Section[];
  removed: Removed[];
  dropped: string[];
  proposal: Awaited<ReturnType<typeof fillBasket>>["proposal"] | null;
  toolCallId: string | null;
  cost: number;
};

const delta = (emit: Emit, ...patch: Patch[]) => emit({ type: EventType.STATE_DELTA, delta: patch });

function say(emit: Emit, text: string) {
  const messageId = crypto.randomUUID();
  emit({ type: EventType.TEXT_MESSAGE_START, messageId, role: "assistant" });
  emit({ type: EventType.TEXT_MESSAGE_CONTENT, messageId, delta: text });
  emit({ type: EventType.TEXT_MESSAGE_END, messageId });
}

// Streams the page: each section the model finishes is checked, then sent as one JSON Patch.
async function streamPage(ask: Ask, profile: Profile, emit: Emit, signal?: AbortSignal) {
  const shelf = shelfOf(ask.products);
  const page = { sections: [] as Section[], removed: [] as Removed[], dropped: [] as string[] };
  const laid = layOut(profile, ask.products, ask.enabled, signal);
  for await (const asked of laid.sections) {
    const checked = checkSection(
      asRequest(asked),
      `s${page.sections.length + page.dropped.length}`,
      shelf,
      profile,
      ask.enabled,
      page.sections,
    );
    page.removed.push(...checked.removed);
    if (checked.dropped) page.dropped.push(`${asked.type}: ${checked.dropped}`);
    if (!checked.section) continue;
    // The old page stays until the first new section is ready, then is replaced one section at a time.
    const clear: Patch[] =
      page.sections.length === 0 ? [{ op: "replace", path: "/sections", value: [] }] : [];
    page.sections.push(checked.section);
    delta(emit, ...clear, addSection(checked.section));
  }
  return { ...page, cost: await laid.cost() };
}

// The basket is a call to the page's proposeBasket tool. The page shows it as a card and waits for Add all.
function propose(emit: Emit, proposal: NonNullable<Outcome["proposal"]>): string {
  const toolCallId = crypto.randomUUID();
  emit({ type: EventType.TOOL_CALL_START, toolCallId, toolCallName: "proposeBasket" });
  emit({ type: EventType.TOOL_CALL_ARGS, toolCallId, delta: JSON.stringify(proposal) });
  emit({ type: EventType.TOOL_CALL_END, toolCallId });
  return toolCallId;
}

export async function personalize(ask: Ask, emit: Emit, signal?: AbortSignal): Promise<Outcome> {
  const understood = await understand(ask.said, ask.profile);
  const { profile } = understood;
  say(emit, understood.reply);
  delta(emit, { op: "replace", path: "/profile", value: profile }, setWorking("Laying out your page"));
  const page = await streamPage(ask, profile, emit, signal);
  let proposal: Outcome["proposal"] = null;
  let toolCallId: string | null = null;
  let cost = understood.cost + page.cost;
  if (understood.wantsBasket) {
    delta(emit, setWorking("Filling your basket"));
    const filled = await fillBasket(profile, ask.products, shelfOf(ask.products));
    proposal = filled.proposal;
    cost += filled.cost;
    page.removed.push(...proposal.removed);
    if (proposal.lines.length > 0) toolCallId = propose(emit, proposal);
  }
  delta(emit, setWorking(null));
  return { profile, reply: understood.reply, ...page, proposal, toolCallId, cost };
}

// After Add all or No thanks: the new basket, as one change to the shared state.
export const basketChanged = (emit: Emit, basket: ShopState["basket"]) => delta(emit, setBasket(basket));
