// The model writes markdown. A terminal cannot show it as a page does, so each line is cut into pieces:
// `code` and **bold** keep their look without their marks, a heading loses its #, a link shows its text.

export type Piece = { text: string; look: "plain" | "code" | "bold" };

const INLINE = /`([^`\n]+)`|\*\*([^*\n]+)\*\*|\[([^\]\n]+)\]\((https?:[^)\s]+)\)/g;

function lineOf(line: string): Piece[] {
  const heading = /^#{1,6} (.*)$/.exec(line);
  if (heading) return [{ text: heading[1] ?? "", look: "bold" }];
  const text = line.replace(/^(\s*)[-*] /, "$1• ");
  const pieces: Piece[] = [];
  let from = 0;
  for (const match of text.matchAll(INLINE)) {
    if (match.index > from) pieces.push({ text: text.slice(from, match.index), look: "plain" });
    if (match[1]) pieces.push({ text: match[1], look: "code" });
    else if (match[2]) pieces.push({ text: match[2], look: "bold" });
    else pieces.push({ text: `${match[3]} (${match[4]})`, look: "plain" });
    from = match.index + match[0].length;
  }
  if (from < text.length) pieces.push({ text: text.slice(from), look: "plain" });
  return pieces;
}

// One list of pieces per line, so the screen draws each line as one row of text.
export function piecesOf(markdown: string): Piece[][] {
  return markdown.split("\n").map(lineOf);
}
