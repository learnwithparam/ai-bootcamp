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
