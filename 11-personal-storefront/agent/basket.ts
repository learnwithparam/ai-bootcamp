import { model } from "@bootcamp/model";
import { generateText, Output } from "ai";
import { z } from "zod";
import { fitBasket } from "../rules/basket";
import type { Product } from "../rules/catalog";
import type { Shelf } from "../rules/layout";
import type { Profile } from "../rules/profile";
import { catalogueText } from "./catalogue";
import { costOf } from "./cost";

// Call three, only when the shopper asks: a week's basket. The model picks products and how many;
// rules/basket.ts keeps what they may have and fits it to the budget. Nothing is added until they say yes.

const Picked = z.object({ items: z.array(z.object({ code: z.string(), quantity: z.number() })) });

const RULES = `You fill a grocery basket for one shopper's week from the catalogue.
Pick 8 to 15 products that make real meals together, with a sensible quantity for how many people they shop for.
Only use codes from the catalogue. Never pick anything they avoid or that breaks their diet.
Keep the total under their weekly budget if they have one.`;

export async function fillBasket(profile: Profile, products: Product[], shelf: Shelf) {
  const result = await generateText({
    model: model(),
    system: `${RULES}\n\n${catalogueText(products)}`,
    prompt: `The shopper:\n${JSON.stringify(profile)}`,
    output: Output.object({ schema: Picked }),
  });
  return { proposal: fitBasket(result.output.items, shelf, profile), cost: costOf(result.steps) };
}
