// Cuts a web page into sections at its headings, so a question can find the one part of a page that answers it.
// Plain code, no AI. HTMLRewriter is built into Bun, so reading HTML needs no extra package.

export type Section = { heading: string; body: string };
export type Page = { title: string; sections: Section[] };

// A long section is split again, so each piece stays small enough to quote.
const MAX_SECTION = 1_800;
const MIN_SECTION = 40;

// Elements that start on a new line. Text inside any other element joins the line it is on.
const BLOCKS =
  "p li div tr dt dd br h4 h5 h6 section article header footer nav aside form fieldset legend ul ol table figure figcaption blockquote details summary".split(
    " ",
  );

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&#x27;": "'",
  "&nbsp;": " ",
};

function decode(text: string): string {
  return text.replace(/&(amp|lt|gt|quot|nbsp|#39|#x27);/g, (entity) => ENTITIES[entity] ?? entity);
}

function tidy(text: string): string {
  return decode(text)
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

// Splits a body at line breaks into pieces no longer than MAX_SECTION.
export function splitLong(section: Section): Section[] {
  if (section.body.length <= MAX_SECTION) return [section];
  const pieces: Section[] = [];
  let current = "";
  for (const line of section.body.split("\n")) {
    if (current && current.length + line.length > MAX_SECTION) {
      pieces.push({ heading: section.heading, body: current });
      current = "";
    }
    current = current ? `${current}\n${line}` : line;
  }
  if (current) pieces.push({ heading: section.heading, body: current });
  return pieces;
}

function finish(title: string, raw: Section[]): Page {
  const sections = raw
    .map((section) => ({ heading: tidy(section.heading), body: tidy(section.body) }))
    .filter((section) => section.body.length >= MIN_SECTION)
    .flatMap(splitLong);
  return { title: tidy(title), sections };
}

type Reading = {
  raw: Section[];
  title: string;
  inMain: boolean;
  inHeading: boolean;
  skipped: number;
};

// Adds text to the current section's heading or body, but only inside <main> and outside skipped tags.
function addText(reading: Reading, text: string) {
  if (!reading.inMain || reading.skipped > 0) return;
  const current = reading.raw[reading.raw.length - 1] as Section;
  if (reading.inHeading) current.heading += text;
  else current.body += text;
}

// One handler per kind of tag. Each handler only flips a flag or adds text to the reading.
function pageReader(reading: Reading): HTMLRewriter {
  return new HTMLRewriter()
    .on("title", {
      text(chunk) {
        reading.title += chunk.text;
      },
    })
    .on("main", {
      element(element) {
        reading.inMain = true;
        element.onEndTag(() => {
          reading.inMain = false;
        });
      },
      text: (chunk) => addText(reading, chunk.text),
    })
    .on("main h1, main h2, main h3", {
      element(element) {
        reading.raw.push({ heading: "", body: "" });
        reading.inHeading = true;
        element.onEndTag(() => {
          reading.inHeading = false;
        });
      },
    })
    .on("main script, main style, main svg, main noscript", {
      element(element) {
        reading.skipped++;
        element.onEndTag(() => {
          reading.skipped--;
        });
      },
    })
    .on(BLOCKS.map((tag) => `main ${tag}`).join(", "), { element: () => addText(reading, "\n") })
    .on("main a, main button, main span, main label, main td, main th", {
      element: () => addText(reading, " "),
    });
}

// Reads the text inside <main>, starting a new section at every h1, h2 and h3.
// Scripts, styles and drawings are skipped. Block elements start a new line.
export async function htmlSections(html: string): Promise<Page> {
  const reading: Reading = {
    raw: [{ heading: "", body: "" }],
    title: "",
    inMain: false,
    inHeading: false,
    skipped: 0,
  };
  await pageReader(reading).transform(new Response(html)).text();
  return finish(reading.title, reading.raw);
}

// The site's llms.txt is markdown: a new section starts at each "## " heading.
export function markdownSections(markdown: string): Page {
  const lines = markdown.split("\n");
  const title = (lines.find((line) => line.startsWith("# ")) ?? "").slice(2);
  const raw: Section[] = [{ heading: title, body: "" }];
  for (const line of lines) {
    if (line.startsWith("## ")) raw.push({ heading: line.slice(3), body: "" });
    else if (!line.startsWith("# ")) (raw[raw.length - 1] as Section).body += `${line}\n`;
  }
  return finish(title, raw);
}

// The pages llms.txt links to, on the site itself only.
export function linkedPages(markdown: string, site: string): string[] {
  const urls = [...markdown.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)].map((match) => match[1] as string);
  return [...new Set(urls.filter((url) => new URL(url).origin === new URL(site).origin))];
}
