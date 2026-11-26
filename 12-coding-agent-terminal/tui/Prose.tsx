/** @jsxImportSource @opentui/react */
import { type Piece, piecesOf } from "../rules/markdown";
import { COLOR } from "./colors";

// The model's words with their markdown drawn, not printed: code in the mark colour, bold as bold.

function Pieces({ line }: { line: Piece[] }) {
  return line.map((piece, index) => {
    const key = `${index}-${piece.look}`;
    if (piece.look === "code")
      return (
        <span key={key} fg={COLOR.mark}>
          {piece.text}
        </span>
      );
    if (piece.look === "bold") return <strong key={key}>{piece.text}</strong>;
    return piece.text;
  });
}

export function Prose({ text, color }: { text: string; color: string }) {
  const lines = piecesOf(text);
  return (
    <box flexDirection="column">
      {lines.map((line, row) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: a message only grows at the end, so line N stays line N
        <text key={row} fg={color}>
          {line.length === 0 ? " " : <Pieces line={line} />}
        </text>
      ))}
    </box>
  );
}
