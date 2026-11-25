// What the assistant's edit changed, line by line, so the owner reads only the change before keeping it.
// A longest common subsequence of lines: the lines both versions share stay, the rest are removed or added.

export type DiffLine = { kind: "same" | "removed" | "added"; text: string };

function commonLengths(before: string[], after: string[]): number[][] {
  const table = Array.from({ length: before.length + 1 }, () => new Array<number>(after.length + 1).fill(0));
  for (let i = before.length - 1; i >= 0; i--) {
    for (let j = after.length - 1; j >= 0; j--) {
      const row = table[i] as number[];
      const below = table[i + 1] as number[];
      row[j] =
        before[i] === after[j]
          ? (below[j + 1] as number) + 1
          : Math.max(below[j] as number, row[j + 1] as number);
    }
  }
  return table;
}

export function lineDiff(beforeText: string, afterText: string): DiffLine[] {
  const before = beforeText.split("\n");
  const after = afterText.split("\n");
  const table = commonLengths(before, after);
  const lines: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < before.length && j < after.length) {
    if (before[i] === after[j]) {
      lines.push({ kind: "same", text: before[i++] as string });
      j++;
    } else if ((table[i + 1]?.[j] ?? 0) >= (table[i]?.[j + 1] ?? 0)) {
      lines.push({ kind: "removed", text: before[i++] as string });
    } else {
      lines.push({ kind: "added", text: after[j++] as string });
    }
  }
  while (i < before.length) lines.push({ kind: "removed", text: before[i++] as string });
  while (j < after.length) lines.push({ kind: "added", text: after[j++] as string });
  return lines;
}

export function changedLineCount(lines: DiffLine[]): number {
  return lines.filter((line) => line.kind !== "same").length;
}

// What the editor shows: every changed line, one line of context on each side, and a count for each run left out.
export type ShownLine = DiffLine | { kind: "folded"; count: number };

export function foldUnchanged(lines: DiffLine[], context = 1): ShownLine[] {
  const near = (at: number) =>
    lines.slice(Math.max(0, at - context), at + context + 1).some((line) => line.kind !== "same");
  const shown: ShownLine[] = [];
  lines.forEach((line, at) => {
    if (line.kind !== "same" || near(at)) {
      shown.push(line);
      return;
    }
    const last = shown.at(-1);
    if (last?.kind === "folded") last.count++;
    else shown.push({ kind: "folded", count: 1 });
  });
  return shown;
}
