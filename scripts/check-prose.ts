import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// Learner pages are read by beginners and by people whose first language is not English.
// Short sentences, no em dashes, no filler words.

const MAX_WORDS = 30;
const FILLER = /\b(simply|just|obviously|basically|leverage|utilize|seamless(ly)?|robust|delve)\b/i;
const SKIP = new Set(["node_modules", ".next", "backend", "frontend", "langfuse"]);

function markdownFiles(folder: string): string[] {
  return readdirSync(folder).flatMap((name) => {
    if (SKIP.has(name) || name.startsWith(".")) return [];
    const path = join(folder, name);
    if (statSync(path).isDirectory()) return markdownFiles(path);
    return name.endsWith(".md") ? [path] : [];
  });
}

function proseLines(text: string): [number, string][] {
  let inCode = false;
  return text.split("\n").flatMap((line, index): [number, string][] => {
    if (line.startsWith("```")) inCode = !inCode;
    if (inCode || line.startsWith("|") || line.startsWith("<!--")) return [];
    return [[index + 1, line.replace(/`[^`]*`/g, "code").replace(/\]\([^)]*\)/g, "]")]];
  });
}

export function checkProse(files = markdownFiles(".")): string[] {
  const problems: string[] = [];
  for (const path of files) {
    for (const [number, line] of proseLines(readFileSync(path, "utf8"))) {
      if (line.includes("—")) problems.push(`${path}:${number}: an em dash. Use a full stop or a comma.`);
      const filler = FILLER.exec(line);
      if (filler) problems.push(`${path}:${number}: "${filler[0]}" adds nothing. Cut it.`);
      for (const sentence of line.split(/[.!?](?:\s|$)/)) {
        const words = sentence.trim().split(/\s+/).filter(Boolean).length;
        if (words > MAX_WORDS) problems.push(`${path}:${number}: a ${words}-word sentence. Split it.`);
      }
    }
  }
  return problems;
}

if (import.meta.main) {
  const problems = checkProse();
  for (const problem of problems) console.error(problem);
  console.log(problems.length ? `\n${problems.length} prose problems.` : "Prose: ok");
  process.exit(problems.length ? 1 : 0);
}
