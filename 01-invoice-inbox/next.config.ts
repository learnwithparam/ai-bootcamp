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
    "@bootcamp/db",
    "@bootcamp/model",
    "@bootcamp/tracing",
    "@bootcamp/ui",
  ],
  // pdf.js loads its own worker file at run time, so the server uses it from node_modules, unbundled.
  serverExternalPackages: ["pdfjs-dist"],
  // Invoices are uploaded through a server action. A few PDFs at once fit in 20 MB.
  experimental: { serverActions: { bodySizeLimit: "20mb" } },
};

export default config;
