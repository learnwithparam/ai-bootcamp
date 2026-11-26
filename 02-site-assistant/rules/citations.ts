// Checks an answer against the pages the assistant actually found. Plain code, no AI.
// The model marks each fact with the number of its source, like [2]. A number it was never given is a bad citation.

export type Source = { number: number; url: string; title: string; heading: string; body: string };

export type CitationCheck = {
  cited: number[];
  bad: number[];
  citedPages: string[];
};

export function checkCitations(answer: string, sources: Source[]): CitationCheck {
  const numbers = [...answer.matchAll(/\[(\d+)\]/g)].map((match) => Number(match[1]));
  const unique = [...new Set(numbers)].sort((a, b) => a - b);
  const known = new Map(sources.map((source) => [source.number, source]));
  const cited = unique.filter((number) => known.has(number));
  const bad = unique.filter((number) => !known.has(number));
  const citedPages = [...new Set(cited.map((number) => known.get(number)?.url as string))];
  return { cited, bad, citedPages };
}

// The pages behind an answer, each shown once with the numbers the answer used. Several sections of one
// page can be found, so one page can carry several numbers. An answer that cites nothing shows every page read.
export type PageRead = { url: string; title: string; numbers: number[] };

export function pagesRead(sources: Source[], answer: string): PageRead[] {
  const { cited } = checkCitations(answer, sources);
  const shown = cited.length > 0 ? sources.filter((source) => cited.includes(source.number)) : sources;
  const pages = new Map<string, PageRead>();
  for (const source of shown) {
    const page = pages.get(source.url) ?? { url: source.url, title: source.title, numbers: [] };
    if (cited.includes(source.number)) page.numbers.push(source.number);
    pages.set(source.url, page);
  }
  return [...pages.values()];
}
