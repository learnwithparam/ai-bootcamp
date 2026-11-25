import { readFileSync } from "node:fs";
import { PRODUCTS } from "@bootcamp/products";
import { firstScreenshot, screenshotPath } from "../../showcase";

// Serves a product's screenshot from its own folder, so the image lives in one place.
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = PRODUCTS.find((candidate) => candidate.slug === slug);
  const screenshot = product ? firstScreenshot(product) : undefined;
  if (!product || !screenshot) return new Response("No screenshot for this product.", { status: 404 });
  const image = readFileSync(screenshotPath(product, screenshot.file));
  return new Response(image, { headers: { "content-type": "image/png", "cache-control": "no-cache" } });
}
