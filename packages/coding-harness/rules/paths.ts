import { isAbsolute, normalize, relative, resolve } from "node:path";

// Where the agent may read and write: inside the repo it was started in, and never in .git,
// which holds the history the review page compares against.

export type PathVerdict = { ok: true; full: string; inRepo: string } | { ok: false; reason: string };

export function checkPath(repo: string, path: string): PathVerdict {
  if (!path.trim()) return { ok: false, reason: "The path is empty." };
  const full = resolve(repo, normalize(path));
  const inRepo = relative(repo, full);
  if (inRepo.startsWith("..") || isAbsolute(inRepo)) {
    return { ok: false, reason: `${path} is outside the repo. Use a path inside it, such as src/index.ts.` };
  }
  const top = inRepo.split("/")[0]?.toLowerCase();
  if (top === ".git") {
    return { ok: false, reason: "The .git folder holds the repo's history. Leave it alone." };
  }
  return { ok: true, full, inRepo: inRepo || "." };
}
