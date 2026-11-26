import { model } from "@bootcamp/model";
import { Output, streamText } from "ai";
import { z } from "zod";
import { AISLES, type Product } from "../rules/catalog";
import type { Profile } from "../rules/profile";
import { SECTION_TYPES, type SectionType } from "../rules/sections";
import { catalogueText } from "./catalogue";
import { costOf } from "./cost";
import instructions from "./instructions.md" with { type: "text" };

// Call two: the page itself, streamed. Each section arrives whole, as soon as the model finishes it,
// so the page can draw it straight away. The model writes one flat shape with the unused fields null;
// rules/layout.ts decides whether each one is a real section.

const Asked = z.object({
  type: z.enum(SECTION_TYPES),
  headline: z.string().nullable(),
  subline: z.string().nullable(),
  title: z.string().nullable(),
  reason: z.string().nullable(),
  code: z.string().nullable(),
  codes: z.array(z.string()).nullable(),
  aisles: z.array(z.enum(AISLES)).nullable(),
  steps: z.array(z.string()).nullable(),
});
export type Asked = z.infer<typeof Asked>;

// The flat shape back into the registry's shape: null fields are left out, so the registry's check is the only check.
export const asRequest = (asked: Asked) =>
  Object.fromEntries(Object.entries(asked).filter(([, value]) => value !== null));

export function layOut(profile: Profile, products: Product[], enabled: SectionType[], signal?: AbortSignal) {
  const result = streamText({
    model: model(),
    // A cap on what this call may write, so one ask stays under ASK_CEILING_USD in rules/state.ts.
    maxOutputTokens: 4000,
    system: `${instructions}\n\n## Allowed sections\n\n${enabled.join(", ")}\n\n${catalogueText(products)}`,
    prompt: `The shopper:\n${JSON.stringify(profile)}\n\nLay out their page.`,
    output: Output.array({ element: Asked }),
    abortSignal: signal,
  });
  return { sections: result.elementStream, cost: async () => costOf(await result.steps) };
}
