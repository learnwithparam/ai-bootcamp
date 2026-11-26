import { extname } from "node:path";

// An edit's change as a unified diff, so the terminal can draw it in red and green.
// The edit tool replaces old_text with new_text exactly once, so the diff is between those two pieces.
// It knows nothing of where they sit in the file, so the terminal draws it without line numbers.

const FILETYPES: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "tsx",
  ".js": "javascript",
  ".json": "json",
  ".md": "markdown",
};

const lines = (text: string) => (text === "" ? [] : text.replace(/\n$/, "").split("\n"));

// The longest run of lines both sides share, so unchanged lines show as context and only real changes are coloured.
// The table is flat: the shared length from line i before and line j after is at i * width + j.
function shared(before: string[], after: string[]): (i: number, j: number) => number {
  const width = after.length + 1;
  const table = new Array<number>((before.length + 1) * width).fill(0);
  const at = (i: number, j: number) => table[i * width + j] ?? 0;
  for (let i = before.length - 1; i >= 0; i--)
    for (let j = after.length - 1; j >= 0; j--)
      table[i * width + j] =
        before[i] === after[j] ? at(i + 1, j + 1) + 1 : Math.max(at(i + 1, j), at(i, j + 1));
  return at;
}

function diffLines(before: string[], after: string[]): string[] {
  const at = shared(before, after);
  const out: string[] = [];
  let i = 0;
  let j = 0;
  while (i < before.length || j < after.length) {
    if (i < before.length && j < after.length && before[i] === after[j]) {
      out.push(` ${before[i]}`);
      i++;
      j++;
    } else if (i < before.length && (j === after.length || at(i + 1, j) >= at(i, j + 1))) {
      out.push(`-${before[i]}`);
      i++;
    } else {
      out.push(`+${after[j]}`);
      j++;
    }
  }
  return out;
}

export function unifiedDiff(path: string, before: string, after: string): string {
  const out = lines(before);
  const into = lines(after);
  const head = `--- a/${path}\n+++ b/${path}\n@@ -1,${out.length} +1,${into.length} @@`;
  return [head, ...diffLines(out, into), ""].join("\n");
}

export function changeOf(
  tool: string,
  input: Record<string, unknown>,
): { text: string; filetype: string } | undefined {
  const path = String(input.path ?? "");
  const filetype = FILETYPES[extname(path)] ?? "text";
  if (tool === "edit")
    return { text: unifiedDiff(path, String(input.old_text ?? ""), String(input.new_text ?? "")), filetype };
  if (tool === "write") return { text: unifiedDiff(path, "", String(input.content ?? "")), filetype };
  return undefined;
}
