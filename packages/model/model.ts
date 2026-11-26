import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { EmbeddingModel, LanguageModel } from "ai";

// The one place a product gets its model. Set MODEL in .env as provider:model, for example
//   MODEL=openrouter:openai/gpt-6-luna
//   MODEL=anthropic:claude-haiku-5-5
// Changing provider is that one line. Every product calls model() and nothing else.

export function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set. Add it to .env (see .env.example).`);
  return value;
}

export function model(setting: string = required("MODEL")): LanguageModel {
  const split = setting.indexOf(":");
  const provider = setting.slice(0, split);
  const name = setting.slice(split + 1);
  if (split < 1 || !name) {
    throw new Error(`MODEL must look like provider:model, got "${setting}".`);
  }
  if (provider === "openrouter") {
    return createOpenRouter({ apiKey: required("OPENROUTER_API_KEY") }).chat(name);
  }
  if (provider === "anthropic") {
    return createAnthropic({ apiKey: required("ANTHROPIC_API_KEY") })(name);
  }
  throw new Error(`MODEL provider must be openrouter or anthropic, got "${provider}".`);
}

// The model that turns text into a list of numbers, so pages can be searched by meaning.
// Anthropic has no embedding model, so this always goes through OpenRouter. Set EMBEDDING_MODEL in the settings file.
export function embeddingModel(name: string = required("EMBEDDING_MODEL")): EmbeddingModel {
  return createOpenRouter({ apiKey: required("OPENROUTER_API_KEY") }).textEmbeddingModel(name);
}

// A model that searches the live web before it answers, and returns the pages it used as sources.
// It runs on OpenRouter's web search, so it always goes through OpenRouter. Set SEARCH_MODEL in the settings file.
export function searchModel(name: string = required("SEARCH_MODEL"), pages = 5): LanguageModel {
  return createOpenRouter({ apiKey: required("OPENROUTER_API_KEY") }).chat(name, {
    plugins: [{ id: "web", max_results: pages }],
    usage: { include: true },
  });
}
