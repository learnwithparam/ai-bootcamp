import { embeddingModel } from "@bootcamp/model";
import { embed, tool } from "ai";
import { z } from "zod";
import { searchSections } from "../../db/queries";
import type { Source } from "../../rules/citations";

const RESULTS = 6;

export type SearchOutput = { sources: Source[] };

// Finds the sections of learnwithparam.com closest in meaning to the query.
// Sources are numbered across the whole reply, so a second search starts where the first ended
// and every [n] in the answer points at exactly one section.
export function searchSite(numbering: { next: number }) {
  return tool({
    description:
      "Search the pages of learnwithparam.com: labs, workshops, the buildcamp, Pro, pricing, FAQ and articles. " +
      "Returns numbered sections. Cite a section as [n] after each fact taken from it.",
    inputSchema: z.object({
      query: z.string().describe("What to look for, in plain words, for example: Pro yearly price"),
    }),
    execute: async ({ query }): Promise<SearchOutput> => {
      const { embedding } = await embed({ model: embeddingModel(), value: query });
      const found = await searchSections(embedding, RESULTS);
      return { sources: found.map((source) => ({ ...source, number: numbering.next++ })) };
    },
  });
}
