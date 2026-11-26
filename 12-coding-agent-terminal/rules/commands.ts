import { PRACTICE_TASKS } from "@bootcamp/coding-harness/rules/tasks";

// What you type in the input box. A line that starts with / is a command; anything else is a task.

export type Typed =
  | { kind: "task"; task: string }
  | { kind: "practice"; slug: string }
  | { kind: "login" | "logout" | "upload" | "clear" | "help" | "exit" }
  | { kind: "unknown"; message: string };

const SIMPLE = ["login", "logout", "upload", "clear", "help", "exit"] as const;
const SLUGS = PRACTICE_TASKS.map((each) => each.slug);

export const HELP = [
  `/practice <${SLUGS.join("|")}>  a real task in a fresh copy of vercel/ms`,
  "/login       sign in to the review site",
  "/upload      send the last run for review",
  "/logout      forget the saved sign-in",
  "/clear       clear the screen",
  "/exit        quit (or Ctrl+C)",
  "Anything else is a task for the repo you started in.",
  "Esc stops a run. Ctrl+O shows or hides each tool's output. Up and Down bring back what you typed.",
].join("\n");

export function readTyped(line: string): Typed | null {
  const text = line.trim();
  if (!text) return null;
  if (!text.startsWith("/")) return { kind: "task", task: text };
  const [name = "", ...rest] = text.slice(1).split(/\s+/);
  if (name === "practice") {
    const slug = rest[0] ?? "";
    if (SLUGS.includes(slug)) return { kind: "practice", slug };
    return { kind: "unknown", message: `Say which practice task: /practice ${SLUGS.join(", /practice ")}.` };
  }
  const simple = SIMPLE.find((each) => each === name);
  if (simple) return { kind: simple };
  return { kind: "unknown", message: `There is no /${name}. Type /help to see the commands.` };
}

// The commands the input box offers as you type a /.
export function suggestions(line: string): string[] {
  if (!line.startsWith("/") || line.includes(" ")) return [];
  const all = [...SLUGS.map((slug) => `/practice ${slug}`), ...SIMPLE.map((name) => `/${name}`)];
  return all.filter((each) => each.startsWith(line) && each !== line).slice(0, 5);
}
