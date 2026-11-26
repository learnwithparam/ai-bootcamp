import type { NextConfig } from "next";

const config: NextConfig = {
  // The repo has one AGENTS.md at the root. Without this, next dev writes another into this folder.
  agentRules: false,
  // No Next.js badge in the corner, so screenshots show only the product.
  devIndicators: false,
  // The browser agent (product 08) opens the portal at 127.0.0.1. Without this, next dev blocks its scripts
  // for that address, the page never becomes interactive, and the agent's messages are never sent.
  allowedDevOrigins: ["127.0.0.1"],
  // The instructions are imported as strings, the same way Bun reads them in the tests.
  turbopack: { rules: { "*.md": { type: "text" } } },
  transpilePackages: [
    "@bootcamp/auth",
    "@bootcamp/db",
    "@bootcamp/model",
    "@bootcamp/tracing",
    "@bootcamp/ui",
  ],
};

export default config;
