import { findProduct } from "@bootcamp/products";

// The firm's intake portal: product 07, running on this machine. The agent's browser may open it and nothing else.
// 127.0.0.1, not localhost: Stagehand's domain limit takes only a dotted host name.
export const PORTAL = process.env.PORTAL_URL ?? `http://127.0.0.1:${findProduct("legal-intake").port}`;
