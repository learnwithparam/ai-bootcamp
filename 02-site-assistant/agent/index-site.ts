import { pool } from "@bootcamp/db";
import { embeddingModel } from "@bootcamp/model";
import { embedMany } from "ai";
import { countPages, savePage } from "../db/queries";
import { htmlSections, linkedPages, markdownSections, type Page } from "../rules/sections";

// bun run seed site-assistant
// Reads learnwithparam.com the way an AI crawler does: llms.txt first, then every page it links to.
// Each page is cut into sections, each section is embedded, and both are saved in Postgres.
// Run it again whenever the site changes; it replaces each page it reads.

export const SITE = "https://www.learnwithparam.com";
const AT_ONCE = 6;

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { "User-Agent": "ai-bootcamp-site-assistant" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`${url} answered ${response.status}.`);
  return response.text();
}

async function embedAndSave(url: string, page: Page) {
  const values = page.sections.map((section) => `${page.title}\n${section.heading}\n${section.body}`);
  const { embeddings } = await embedMany({ model: embeddingModel(), values });
  await savePage(url, page, embeddings);
}

async function seedPage(url: string): Promise<string> {
  const page = await htmlSections(await fetchText(url));
  if (!page.sections.length) return `skipped ${url}: no text in <main>`;
  await embedAndSave(url, page);
  return "";
}

export async function seedSite() {
  const llms = await fetchText(`${SITE}/llms.txt`);
  await embedAndSave(`${SITE}/llms.txt`, markdownSections(llms));
  const urls = linkedPages(llms, SITE);
  const problems: string[] = [];
  for (let start = 0; start < urls.length; start += AT_ONCE) {
    const batch = urls.slice(start, start + AT_ONCE);
    const results = await Promise.allSettled(batch.map(seedPage));
    results.forEach((result, index) => {
      if (result.status === "rejected") problems.push(`${batch[index]}: ${result.reason}`);
      else if (result.value) problems.push(result.value);
    });
  }
  for (const problem of problems) console.error(problem);
  console.log(`Saved ${await countPages()} pages of ${SITE}.`);
}

if (import.meta.main) {
  await seedSite();
  await pool.end();
}
