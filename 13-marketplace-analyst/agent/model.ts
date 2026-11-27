import { AsyncLocalStorage } from "node:async_hooks";
import { model } from "@bootcamp/model";
import { wrapLanguageModel } from "ai";

// This product's model: a small, cheap one that calls tools well. Change this one line to use another.
const SETTING = "openrouter:nvidia/nemotron-3.5-lightning";

// The same model behaves differently on each host. On a heavily compressed one it often skipped the
// sentence of an answer or replied with blank space, so the better ones are asked first.
const HOSTS = { order: ["Fireworks", "DeepInfra"] };

// It is a reasoning model. Writing SQL and judging claims need that thinking. Picking an intent or a
// sentence does not, and left on it can think until the reply is cut off with nothing in it.
const NO_REASONING = { enabled: false };

// While `recording` runs, every prompt sent to the model is kept, so the evals can search what was
// really sent for values from the rows. Nothing is kept at any other time.
const recorder = new AsyncLocalStorage<string[]>();

export async function recording<T>(run: () => Promise<T>): Promise<{ value: T; prompts: string[] }> {
  const prompts: string[] = [];
  const value = await recorder.run(prompts, run);
  return { value, prompts };
}

type Wrappable = Parameters<typeof wrapLanguageModel>[0]["model"];

export function analystModel({ thinks }: { thinks: boolean }) {
  return wrapLanguageModel({
    model: model(SETTING) as Wrappable,
    middleware: {
      specificationVersion: "v3",
      transformParams: async ({ params }) => {
        recorder.getStore()?.push(JSON.stringify(params.prompt));
        const openrouter = {
          ...params.providerOptions?.openrouter,
          provider: HOSTS,
          ...(thinks ? {} : { reasoning: NO_REASONING }),
        };
        return { ...params, providerOptions: { ...params.providerOptions, openrouter } };
      },
    },
  });
}
