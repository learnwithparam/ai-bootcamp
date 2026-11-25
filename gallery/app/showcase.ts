import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Product } from "@bootcamp/products";

// `bun run dev` starts the gallery from gallery/, so each product folder is one level up.
const ROOT = join(process.cwd(), "..");

export type Screenshot = { file: string; alt: string };

// The first picture under "What you will see" in the product's README, so the README stays the one place it is chosen.
export function firstScreenshot(product: Product): Screenshot | undefined {
  const readme = readFileSync(join(ROOT, product.folder, "README.md"), "utf8");
  const match = /!\[([^\]]*)\]\(screenshots\/([^)]+)\)/.exec(readme);
  return match ? { alt: match[1] ?? "", file: match[2] ?? "" } : undefined;
}

export function screenshotPath(product: Product, file: string): string {
  return join(ROOT, product.folder, "screenshots", file);
}

// A product counts as running when anything answers on its port. A closed port is the normal case, not an error.
export async function isRunning(port: number): Promise<boolean> {
  const response = await fetch(`http://localhost:${port}`, {
    redirect: "manual",
    signal: AbortSignal.timeout(500),
  }).catch(() => undefined);
  return response !== undefined;
}
