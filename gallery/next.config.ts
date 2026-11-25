import type { NextConfig } from "next";

// The gallery only lists the products. It reads no secrets and calls no model.
const config: NextConfig = {
  // The repo has one AGENTS.md at the root. Without this, next dev writes another into this folder.
  agentRules: false,
  // No Next.js badge in the corner, so screenshots show only the product.
  devIndicators: false,
  transpilePackages: ["@bootcamp/products", "@bootcamp/ui"],
};

export default config;
