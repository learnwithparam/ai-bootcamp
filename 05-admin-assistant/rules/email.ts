// A newsletter is written in a small part of Markdown: headings, paragraphs, bullet lists, links and bold.
// This turns it into blocks the email preview draws, so the owner reads the email and never the raw marks.
// Only https links survive; anything else stays as plain text.

export type Inline = { text: string; href?: string; bold?: boolean };
export type Block =
  | { kind: "heading"; level: 1 | 2 | 3; parts: Inline[] }
  | { kind: "paragraph"; parts: Inline[] }
  | { kind: "list"; items: Inline[][] };

const INLINE = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*/g;

export function inlineParts(line: string): Inline[] {
  const parts: Inline[] = [];
  let last = 0;
  for (const match of line.matchAll(INLINE)) {
    const at = match.index ?? 0;
    if (at > last) parts.push({ text: line.slice(last, at) });
    const [whole, label, href, bold] = match;
    if (bold) parts.push({ text: bold, bold: true });
    else if (label && href?.startsWith("https://")) parts.push({ text: label, href });
    else parts.push({ text: whole });
    last = at + whole.length;
  }
  if (last < line.length) parts.push({ text: line.slice(last) });
  return parts;
}

function heading(line: string): Block | null {
  const match = /^(#{1,3})\s+(.*)$/.exec(line);
  if (!match) return null;
  return {
    kind: "heading",
    level: (match[1] as string).length as 1 | 2 | 3,
    parts: inlineParts(match[2] as string),
  };
}

export function emailBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length) blocks.push({ kind: "paragraph", parts: inlineParts(paragraph.join(" ")) });
    paragraph = [];
  };
  for (const raw of markdown.split("\n")) {
    const line = raw.trim();
    const item = /^(?:[-*]|\d+\.)\s+(.*)$/.exec(line);
    if (!line) flush();
    else if (heading(line)) {
      flush();
      blocks.push(heading(line) as Block);
    } else if (item) {
      flush();
      const previous = blocks.at(-1);
      const parts = inlineParts(item[1] as string);
      if (previous?.kind === "list") previous.items.push(parts);
      else blocks.push({ kind: "list", items: [parts] });
    } else paragraph.push(line);
  }
  flush();
  return blocks;
}

// Every link in a newsletter, for the check that each one came from the live catalog.
export function linksIn(markdown: string): string[] {
  return [...markdown.matchAll(INLINE)].flatMap((match) => (match[2] ? [match[2]] : []));
}

// One line as the reader sees it: no heading or list marks, links shown as their words, bold as plain text.
export function plainLine(line: string): string {
  const text = line
    .trim()
    .replace(/^#{1,3}\s+/, "")
    .replace(/^(?:[-*]|\d+\.)\s+/, "");
  return inlineParts(text)
    .map((part) => part.text)
    .join("");
}

// A newsletter may link only to the school's own site. The tools refuse other links, and so does approval.
// The mail tool may link more than this preview does (bare addresses, <autolinks>, reference links),
// so the check reads every address-like piece of the body, not only [text](url), and parses each one.
export const SITE = "https://www.learnwithparam.com";

const ADDRESS_LIKE =
  /(?:\b(?:https?|ftp|file|data|javascript|vbscript|mailto|tel|sms):|\bwww\.|(?<![\w:])\/\/)[^\s)\]>"'<]*/gi;

function isSiteLink(text: string): boolean {
  const withScheme = text.toLowerCase().startsWith("www.") ? "https://".concat(text) : text;
  const url = URL.parse(withScheme.startsWith("//") ? "https:".concat(withScheme) : withScheme);
  return url?.origin === SITE && url.username === "" && url.password === "";
}

// Marks outside the small Markdown above that another renderer could turn into a hidden link:
// raw HTML, entities, backslash escapes and reference definitions. A body with any of them is refused whole.
const LINK_TRICKS = /[<>\\]|&[#\w]+;|^\s*\[[^\]]*\]:/gm;

export function foreignLinks(markdown: string): string[] {
  const tricks = [...markdown.matchAll(LINK_TRICKS)].map((match) => match[0].trim());
  const addresses = [...markdown.matchAll(ADDRESS_LIKE)].map((match) => match[0]);
  return [...tricks, ...addresses.filter((text) => !isSiteLink(text))];
}
