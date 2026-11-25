// Reads the school's catalog from llms.txt, the plain list learnwithparam.com publishes for AI tools.
// Each "## " heading is a kind of item, and each "- [Title](url): ..." line under it is one item.

export const KINDS = [
  "upcoming",
  "lab",
  "course",
  "lightning",
  "post",
  "newsletter",
  "playbook",
  "ebook",
] as const;

export type Kind = (typeof KINDS)[number];

export type Item = {
  kind: Kind;
  title: string;
  url: string;
  date: string | null;
  duration: string | null;
  summary: string;
};

// The heading on the site, and the kind it lists. A heading that is not here, like "More", is skipped.
const HEADINGS: [string, Kind][] = [
  ["Upcoming live labs", "upcoming"],
  ["Past labs", "lab"],
  ["Pro video courses", "course"],
  ["Free Lightning sessions", "lightning"],
  ["Blog", "post"],
  ["newsletter issues", "newsletter"],
  ["Playbooks", "playbook"],
  ["Ebooks", "ebook"],
];

const LINE = /^- \[(.+?)\]\((https?:\/\/[^)\s]+)\)(?::\s*(.*))?$/;
// "1 hour, 2026-12-03. A test set..." for an upcoming lab, "ran 2026-10-22. A board..." for a past one.
const WHEN = /^(?:(?<duration>[^,.]+?), )?(?:ran )?(?<date>\d{4}-\d{2}-\d{2})\.\s*/;

export function kindOf(heading: string): Kind | null {
  return HEADINGS.find(([words]) => heading.includes(words))?.[1] ?? null;
}

export function parseLine(line: string, kind: Kind): Item | null {
  const match = LINE.exec(line.trim());
  if (!match) return null;
  const [, title = "", url = "", rest = ""] = match;
  const when = WHEN.exec(rest);
  return {
    kind,
    title,
    url,
    date: when?.groups?.date ?? null,
    duration: when?.groups?.duration ?? null,
    summary: when ? rest.slice(when[0].length) : rest,
  };
}

// An item listed twice, like a lab that is both upcoming and in the past list, keeps its first listing.
export function parseCatalog(text: string): Item[] {
  const items = new Map<string, Item>();
  let kind: Kind | null = null;
  for (const line of text.split("\n")) {
    if (line.startsWith("## ")) kind = kindOf(line.slice(3));
    else if (kind && line.startsWith("- ")) {
      const item = parseLine(line, kind);
      if (item && !items.has(item.url)) items.set(item.url, item);
    }
  }
  return [...items.values()];
}

// Upcoming sessions on or after today, soonest first. Today is passed in, so the rule is the same in a test.
export function upcoming(items: Item[], today: string): Item[] {
  return items
    .filter((item) => item.kind === "upcoming" && item.date !== null && item.date >= today)
    .sort((first, second) => (first.date ?? "").localeCompare(second.date ?? ""));
}
