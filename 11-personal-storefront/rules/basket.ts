import { z } from "zod";
import { pounds } from "./catalog";
import type { Shelf } from "./layout";
import { type Profile, whyNot } from "./profile";
import type { Removed } from "./sections";

// "Fill my basket": the agent suggests products and how many of each. This keeps what the shopper may have,
// then takes the dearest lines off until the total fits their budget. The total is added up here, never by the model.

export type Wanted = { code: string; quantity: number };
export type Line = { code: string; name: string; quantity: number; pricePence: number; image: string };
export type Proposal = { lines: Line[]; totalPence: number; removed: Removed[]; budgetPence: number | null };

// The proposal as the page's basket card receives it, as the arguments of the proposeBasket tool call.
export const ProposalSchema = z.object({
  lines: z.array(
    z.object({
      code: z.string(),
      name: z.string(),
      quantity: z.number(),
      pricePence: z.number(),
      image: z.string(),
    }),
  ),
  totalPence: z.number(),
  removed: z.array(z.object({ code: z.string(), name: z.string(), why: z.string() })),
  budgetPence: z.number().nullable(),
});

export const totalOf = (lines: Line[]) =>
  lines.reduce((sum, line) => sum + line.quantity * line.pricePence, 0);

function linesFor(wanted: Wanted[], shelf: Shelf, profile: Profile, removed: Removed[]): Line[] {
  const lines = new Map<string, Line>();
  for (const { code, quantity } of wanted) {
    const product = shelf.get(code);
    const why = product ? whyNot(product, profile) : "not a product we sell";
    if (!product || why) {
      removed.push({ code, name: product?.name ?? "(not in the shop)", why: why ?? "" });
      continue;
    }
    const count = Math.min(Math.max(Math.round(quantity), 1), 6);
    const { name, pricePence, image } = product;
    lines.set(code, { code, name, pricePence, image, quantity: (lines.get(code)?.quantity ?? 0) + count });
  }
  return [...lines.values()];
}

export function fitBasket(wanted: Wanted[], shelf: Shelf, profile: Profile): Proposal {
  const removed: Removed[] = [];
  const lines = linesFor(wanted, shelf, profile, removed);
  const budget = profile.budgetPence;
  while (budget !== null && lines.length > 0 && totalOf(lines) > budget) {
    const dearest = lines.reduce((top, line) =>
      line.pricePence * line.quantity > top.pricePence * top.quantity ? line : top,
    );
    lines.splice(lines.indexOf(dearest), 1);
    removed.push({ code: dearest.code, name: dearest.name, why: `over the ${pounds(budget)} budget` });
  }
  return { lines, totalPence: totalOf(lines), removed, budgetPence: budget };
}
