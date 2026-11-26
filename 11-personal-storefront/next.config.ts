import type { NextConfig } from "next";

const config: NextConfig = {
  // The repo has one AGENTS.md at the root. Without this, next dev writes another into this folder.
  agentRules: false,
  // No Next.js badge in the corner, so screenshots show only the product.
  devIndicators: false,
  // The instructions are imported as strings, the same way Bun reads them in the tests.
  turbopack: { rules: { "*.md": { type: "text" } } },
  // Product photos come from Open Food Facts' image server, sized and cached by Next.
  images: { remotePatterns: [{ protocol: "https", hostname: "images.openfoodfacts.org" }] },
  transpilePackages: [
    "@bootcamp/auth",
    "@bootcamp/db",
    "@bootcamp/model",
    "@bootcamp/tracing",
    "@bootcamp/ui",
  ],
};

export default config;
