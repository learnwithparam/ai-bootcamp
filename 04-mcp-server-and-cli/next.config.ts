import type { NextConfig } from "next";

const config: NextConfig = {
  // The repo has one AGENTS.md at the root. Without this, next dev writes another into this folder.
  agentRules: false,
  // No Next.js badge in the corner, so screenshots show only the product.
  devIndicators: false,
  // agent/instructions.md is imported as a string, the same way Bun reads it in the tests.
  turbopack: { rules: { "*.md": { type: "text" } } },
  transpilePackages: [
    "@bootcamp/auth",
    "@bootcamp/catalog",
    "@bootcamp/db",
    "@bootcamp/model",
    "@bootcamp/tracing",
    "@bootcamp/ui",
  ],
};

export default config;
