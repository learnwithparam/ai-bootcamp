// The list of products, in learning order. The gallery, the dev command, sign-in and the checks
// all read this list, so a product's port and folder are written only here.

export type Idea =
  | "graph"
  | "loop"
  | "verification"
  | "boundary"
  | "skills"
  | "context"
  | "harness"
  | "mcp"
  | "cli"
  | "browser automation"
  | "decision model"
  | "voice"
  | "human in the loop"
  | "ui the agent draws"
  | "memory"
  | "structured output"
  | "terminal ui"
  | "shared state"
  | "adaptive ui";

export type Product = {
  folder: string;
  slug: string;
  title: string;
  job: string;
  // The product's web port, from 3101. A product that runs only in a terminal has none, and names its command.
  port?: number;
  command?: string;
  ideas: Idea[];
  // Where the agent's loop lives, from the product folder. Only set when it is not agent/agent.ts,
  // as for the coding agent, whose loop is shared with the terminal app in packages/coding-harness.
  agent?: string;
};

export const GALLERY_PORT = 3100;

export const PRODUCTS: Product[] = [
  {
    folder: "01-invoice-inbox",
    slug: "invoice-inbox",
    title: "Invoice inbox",
    job: "Read supplier invoices and match each one to its purchase order.",
    port: 3101,
    ideas: ["structured output", "verification", "human in the loop"],
  },
  {
    folder: "02-site-assistant",
    slug: "site-assistant",
    title: "Site assistant",
    job: "Answer visitors from the site's own pages, show members their plan, and hand off to a person.",
    port: 3102,
    ideas: ["loop", "context", "decision model", "boundary", "verification", "human in the loop"],
  },
  {
    folder: "04-mcp-server-and-cli",
    slug: "mcp-server-and-cli",
    title: "MCP server and CLI",
    job: "Offer the school's catalog as one set of tools, used from chat, from Claude or Cursor, and from a terminal.",
    port: 3104,
    ideas: ["mcp", "cli", "boundary"],
  },
  {
    folder: "05-admin-assistant",
    slug: "admin-assistant",
    title: "Admin assistant",
    job: "Answer the owner's questions about signups, make Stripe coupons after approval, and draft the newsletter.",
    port: 3105,
    ideas: ["skills", "ui the agent draws", "human in the loop", "boundary"],
  },
  {
    folder: "06-research-agent",
    slug: "research-agent",
    title: "Research agent",
    job: "Research a company on the live web, check every claim against its page, and score it as a lead.",
    port: 3106,
    ideas: ["graph", "verification", "structured output"],
  },
  {
    folder: "07-legal-intake",
    slug: "legal-intake",
    title: "Legal intake",
    job: "Take a client's request, check it for conflicts, and wait for a lawyer to decide, even across a restart.",
    port: 3107,
    ideas: ["graph", "human in the loop", "boundary", "verification"],
  },
  {
    folder: "08-browser-agent",
    slug: "browser-agent",
    title: "Browser agent",
    job: "Turn client emails into requests on the firm's intake portal, and let a decision model say when to send.",
    port: 3108,
    ideas: ["browser automation", "decision model", "boundary", "verification", "human in the loop"],
  },
  {
    folder: "09-team-workspace",
    slug: "team-workspace",
    title: "Team workspace",
    job: "Give a team one chat with saved history, memory across chats, and the tools of the MCP servers it connects.",
    port: 3109,
    ideas: ["mcp", "memory", "context", "boundary", "human in the loop"],
  },
  {
    folder: "10-coding-agent",
    slug: "coding-agent",
    title: "Coding agent",
    job: "Fix a bug in a real repo from the terminal, with a check that must pass before it stops, then let a teammate review the run.",
    port: 3110,
    ideas: ["harness", "loop", "verification", "boundary", "skills", "cli", "human in the loop"],
    agent: "../packages/coding-harness/agent/agent.ts",
  },
  {
    folder: "11-personal-storefront",
    slug: "personal-storefront",
    title: "Personal storefront",
    job: "Lay out a grocery shop for each shopper from what they say, and never show a product their allergies or diet rule out.",
    port: 3111,
    ideas: ["adaptive ui", "shared state", "ui the agent draws", "human in the loop", "boundary"],
  },
  {
    folder: "12-coding-agent-terminal",
    slug: "coding-agent-terminal",
    title: "Coding agent terminal",
    job: "Work with the coding agent in a terminal app: watch it think, read each change before it lands, say yes or no, and stop it with Esc.",
    command: "bun run terminal",
    ideas: ["terminal ui", "human in the loop", "harness", "loop"],
  },
];

export const ALL_PORTS = [GALLERY_PORT, ...PRODUCTS.flatMap((product) => product.port ?? [])];

export function findProduct(slug: string): Product {
  const product = PRODUCTS.find((each) => each.slug === slug);
  if (!product) {
    const known = PRODUCTS.map((each) => each.slug).join(", ");
    throw new Error(`No product called "${slug}". Known products: ${known}.`);
  }
  return product;
}

// The port a web product listens on. A terminal product has no port, so asking for one is a mistake in the code.
export function portOf(slug: string): number {
  const product = findProduct(slug);
  if (product.port === undefined)
    throw new Error(`${product.title} runs in a terminal, not on a port. Start it with: ${product.command}`);
  return product.port;
}
