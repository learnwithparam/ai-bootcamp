// Turns `git diff` text into files and lines the review page can draw with line numbers.

export type DiffLine = {
  kind: "add" | "remove" | "same";
  text: string;
  oldNumber: number | null;
  newNumber: number | null;
};
export type DiffHunk = { header: string; lines: DiffLine[] };
export type DiffFile = { path: string; added: number; removed: number; hunks: DiffHunk[] };

const HUNK = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@ ?(.*)$/;

type Place = { file?: DiffFile; hunk?: DiffHunk; oldLine: number; newLine: number };

function readLine(line: string, place: Place, files: DiffFile[]) {
  const { file, hunk } = place;
  if (line.startsWith("diff --git ")) {
    place.file = { path: line.split(" b/").pop() ?? "", added: 0, removed: 0, hunks: [] };
    place.hunk = undefined;
    files.push(place.file);
  } else if (file && line.startsWith("@@")) {
    const [, oldStart = "1", newStart = "1", rest = ""] = line.match(HUNK) ?? [];
    place.hunk = { header: rest.trim(), lines: [] };
    place.oldLine = Number(oldStart);
    place.newLine = Number(newStart);
    file.hunks.push(place.hunk);
  } else if (file && hunk && line.startsWith("+")) {
    hunk.lines.push({ kind: "add", text: line.slice(1), oldNumber: null, newNumber: place.newLine++ });
    file.added++;
  } else if (file && hunk && line.startsWith("-")) {
    hunk.lines.push({ kind: "remove", text: line.slice(1), oldNumber: place.oldLine++, newNumber: null });
    file.removed++;
  } else if (hunk && line.startsWith(" ")) {
    hunk.lines.push({
      kind: "same",
      text: line.slice(1),
      oldNumber: place.oldLine++,
      newNumber: place.newLine++,
    });
  }
}

export function parseDiff(text: string): DiffFile[] {
  const files: DiffFile[] = [];
  const place: Place = { oldLine: 0, newLine: 0 };
  for (const line of text.split("\n")) readLine(line, place, files);
  return files;
}
