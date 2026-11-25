import { changedLineCount, foldUnchanged, lineDiff, type ShownLine } from "../rules/diff";
import { plainLine } from "../rules/email";

function Line({ line }: { line: ShownLine }) {
  if (line.kind === "folded") {
    return <div className="diff-folded">{line.count === 1 ? "1 line" : `${line.count} lines`} the same</div>;
  }
  const text = plainLine(line.text);
  if (line.kind === "removed") return <del className="diff-removed">{text}</del>;
  if (line.kind === "added") return <ins className="diff-added">{text}</ins>;
  return <div className="diff-same">{text}</div>;
}

// The assistant's last edit as the reader sees the words: removed lines struck through, added lines in green,
// and unchanged runs folded to a count. Blank lines are left out, since they only space the email.
export function DiffView({ before, after }: { before: string; after: string }) {
  const lines = lineDiff(before, after).filter((line) => line.text.trim() !== "");
  return (
    <figure className="diff" aria-label={`${changedLineCount(lines)} lines changed`}>
      {foldUnchanged(lines).map((line, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: the lines of a diff never move, so their place is their name.
        <Line key={index} line={line} />
      ))}
    </figure>
  );
}
