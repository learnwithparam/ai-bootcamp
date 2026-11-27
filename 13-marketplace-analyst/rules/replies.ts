// The guardrails node answers these itself, with fixed words. No other node runs.

export type Intent = "in_scope" | "greeting" | "out_of_scope" | "unsafe";

export const REPLIES: Record<Exclude<Intent, "in_scope">, string> = {
  greeting:
    "Hello. I am your marketplace analyst. Ask me about orders, customers, payments, products, sellers, deliveries or review scores.",
  out_of_scope:
    "I can only answer from this marketplace's records: orders, customers, payments, products, sellers and reviews. Try a question about one of those.",
  unsafe:
    "I cannot do that. I only read the marketplace's records: nothing here can change or delete them, or show another account's data.",
};

export const OVER_BUDGET =
  "This question reached its spending limit before an answer was ready. Ask a narrower one.";

export const NO_QUERY = "I could not write a query that runs for that question. Try asking it another way.";
