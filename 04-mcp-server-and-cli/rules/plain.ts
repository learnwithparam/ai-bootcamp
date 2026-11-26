// How the developer pages say things in plain words. No AI in this file.

export type How = "device" | "browser" | "server";
export type Via = "page" | "ask" | "app";

// What each OAuth scope lets an app do, as a person would say it.
const SCOPE_WORDS: Record<string, string> = {
  openid: "Know it is you",
  profile: "See your name",
  email: "See your email",
  offline_access: "Stay signed in",
};

// Always in the same order, the known scopes first, so two apps with the same rights read the same.
export function scopeWords(scopes: string[]): string[] {
  const order = Object.keys(SCOPE_WORDS);
  const rank = (scope: string) => (order.includes(scope) ? order.indexOf(scope) : order.length);
  return [...scopes].sort((a, b) => rank(a) - rank(b)).map((scope) => SCOPE_WORDS[scope] ?? scope);
}

export const HOW_WORDS: Record<How, string> = {
  device: "Signed in with a code, from a terminal",
  browser: "Signed in through the browser, as a desktop app",
  server: "Signed in through the browser, as a web app with a secret",
};

export function viaWords(via: Via, appName: string | null): string {
  if (via === "page") return "This page";
  if (via === "ask") return "Ask in plain words";
  return appName ?? "A connected app";
}

const shown = (value: unknown) => (typeof value === "string" ? `"${value}"` : JSON.stringify(value));

// { query: "evals", kind: "lab" } reads as: query "evals", kind "lab". An empty input reads as "No input".
export function inputWords(input: Record<string, unknown>): string {
  const parts = Object.entries(input).map(([name, value]) => `${name} ${shown(value)}`);
  return parts.length ? parts.join(", ") : "No input";
}

// The same call, typed in the terminal. A tool `search_catalog` is the command `search-catalog`.
export function cliCommand(tool: string, input: Record<string, string>, firstRequired?: string): string {
  const quote = (value: string) => (/^[\w./:-]+$/.test(value) ? value : `"${value.replaceAll('"', '\\"')}"`);
  const words = [`bun run cli ${tool.replaceAll("_", "-")}`];
  if (firstRequired && input[firstRequired]) words.push(quote(input[firstRequired]));
  for (const [name, value] of Object.entries(input))
    if (name !== firstRequired && value) words.push(`--${name} ${quote(value)}`);
  return words.join(" ");
}

// The same call, as the JSON-RPC message Claude or Cursor sends to /mcp.
export function mcpCall(tool: string, input: Record<string, string>): string {
  const args = Object.fromEntries(Object.entries(input).filter(([, value]) => value));
  const message = { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: tool, arguments: args } };
  return JSON.stringify(message, null, 2);
}

// "3 minutes ago", "yesterday", or the date: how a list of recent things reads at a glance.
export function whenWords(at: Date, now: Date): string {
  const minutes = Math.round((now.getTime() - at.getTime()) / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  if (hours < 48) return "Yesterday";
  return at.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// One wrong argument, the way the schema reports it. Only the fields this file reads.
export type InputIssue = {
  code: string;
  path: PropertyKey[];
  message: string;
  minimum?: number | bigint;
  values?: unknown[];
  input?: unknown;
};

function issueWords(issue: InputIssue): string {
  const field = String(issue.path[0] ?? "The input");
  if (issue.code === "too_small") return `${field} needs at least ${issue.minimum} characters.`;
  if (issue.code === "invalid_value") return `${field} must be one of: ${issue.values?.join(", ")}.`;
  if (issue.code === "invalid_type" && issue.input === undefined) return `${field} is required.`;
  if (issue.code === "invalid_format")
    return `${field} is not a valid ${field === "url" ? "link" : "value"}.`;
  return `${field}: ${issue.message}`;
}

// "query needs at least 2 characters." The same sentence on the page, in Claude and in the terminal.
export function inputProblem(issues: InputIssue[]): string {
  return issues.map(issueWords).join(" ");
}

// A catalog date ("2026-11-05") the way people read it ("5 Nov 2026"). Anything else is shown as it came.
export function dateWords(isoDate: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
  const options = { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" } as const;
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-GB", options);
}
