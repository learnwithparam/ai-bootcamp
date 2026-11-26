import { mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { checkPath } from "../../rules/paths";

// The three file tools. Each one checks its path first, so the agent reads and writes only inside the repo.

export type ToolAnswer = { ok: boolean; output: string };

const MAX_LINES = 2000;

// A link inside the repo can point outside it. The real path is checked as well as the written one.
async function insideRepo(repo: string, path: string): Promise<{ full: string } | { refused: string }> {
  const checked = checkPath(repo, path);
  if (!checked.ok) return { refused: checked.reason };
  const realRepo = await realpath(repo);
  const real = await realpath(checked.full).catch(() =>
    realpath(dirname(checked.full)).catch(() => realRepo),
  );
  const again = checkPath(realRepo, real);
  return again.ok ? { full: checked.full } : { refused: `${path} leads outside the repo.` };
}

export async function readTool(repo: string, input: { path: string }): Promise<ToolAnswer> {
  const place = await insideRepo(repo, input.path);
  if ("refused" in place) return { ok: false, output: place.refused };
  const text = await readFile(place.full, "utf8").catch(() => null);
  if (text === null)
    return { ok: false, output: `${input.path} does not exist. Run ls to see what is there.` };
  const lines = text.split("\n");
  const numbered = lines.slice(0, MAX_LINES).map((line, index) => `${index + 1}\t${line}`);
  const more = lines.length > MAX_LINES ? `\n[${lines.length - MAX_LINES} more lines not shown]` : "";
  return { ok: true, output: numbered.join("\n") + more };
}

export async function writeTool(repo: string, input: { path: string; content: string }): Promise<ToolAnswer> {
  const place = await insideRepo(repo, input.path);
  if ("refused" in place) return { ok: false, output: place.refused };
  await mkdir(dirname(place.full), { recursive: true });
  await writeFile(place.full, input.content);
  return { ok: true, output: `Wrote ${input.content.split("\n").length} lines to ${input.path}.` };
}

// Replaces one exact piece of a file. The piece must appear once, so the agent cannot change the wrong place.
export async function editTool(
  repo: string,
  input: { path: string; old_text: string; new_text: string },
): Promise<ToolAnswer> {
  const place = await insideRepo(repo, input.path);
  if ("refused" in place) return { ok: false, output: place.refused };
  const text = await readFile(place.full, "utf8").catch(() => null);
  if (text === null) return { ok: false, output: `${input.path} does not exist.` };
  const count = text.split(input.old_text).length - 1;
  if (count !== 1) {
    const found = count === 0 ? "does not appear" : `appears ${count} times`;
    return {
      ok: false,
      output: `The old text ${found} in ${input.path}. Read the file and copy one exact piece.`,
    };
  }
  await writeFile(
    place.full,
    text.replace(input.old_text, () => input.new_text),
  );
  return { ok: true, output: `Edited ${input.path}.` };
}
