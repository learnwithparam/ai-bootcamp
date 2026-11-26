import { readFile } from "node:fs/promises";
import { join } from "node:path";

// The browser's PDF viewer runs pdf.js in a web worker. This serves that worker file from the pinned package,
// so the viewer and the server read PDFs with the same pdf.js version.
const WORKER = join(process.cwd(), "node_modules/pdfjs-dist/build/pdf.worker.min.mjs");

export async function GET() {
  return new Response(await readFile(WORKER), {
    headers: { "content-type": "text/javascript", "cache-control": "public, max-age=86400" },
  });
}
