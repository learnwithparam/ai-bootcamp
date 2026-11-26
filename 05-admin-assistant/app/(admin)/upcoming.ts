import { parseCatalog } from "@bootcamp/catalog";
import { todayUtc } from "../../rules/days";
import { whatsNew } from "../../rules/whats-new";

const CATALOG = "https://www.learnwithparam.com/llms.txt";

// The next live lab on the site, for the suggestion on Home. Read live and kept for an hour.
// When the site cannot be read, Home says so instead of guessing.
export async function nextLab(): Promise<{
  lab: { title: string; date: string } | null;
  problem: string | null;
}> {
  const response = await fetch(CATALOG, { next: { revalidate: 3600 } });
  if (!response.ok) {
    console.error(`admin-assistant: the catalog answered ${response.status}`);
    return {
      lab: null,
      problem: `The site catalog answered ${response.status}, so live labs are not shown.`,
    };
  }
  const [first] = whatsNew(parseCatalog(await response.text()), todayUtc(), todayUtc()).upcoming;
  return { lab: first ? { title: first.title, date: first.date ?? "" } : null, problem: null };
}
