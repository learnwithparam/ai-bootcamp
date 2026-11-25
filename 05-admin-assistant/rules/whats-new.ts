import type { Item } from "@bootcamp/catalog";

// The raw material for a newsletter, from the catalog the site publishes.
// Labs carry a date. Posts do not, so the newsletter takes the first ones the blog lists.
export type WhatsNew = { upcoming: Item[]; ranRecently: Item[]; posts: Item[] };

export function whatsNew(items: Item[], since: string, today: string, postCount = 5): WhatsNew {
  const byDate = (first: Item, second: Item) => (first.date ?? "").localeCompare(second.date ?? "");
  return {
    upcoming: items.filter((item) => item.kind === "upcoming" && (item.date ?? "") >= today).sort(byDate),
    ranRecently: items
      .filter((item) => item.kind === "lab" && (item.date ?? "") >= since && (item.date ?? "") <= today)
      .sort(byDate),
    posts: items.filter((item) => item.kind === "post").slice(0, postCount),
  };
}
