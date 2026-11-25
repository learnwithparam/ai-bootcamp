import { getDocument, VerbosityLevel } from "pdfjs-dist/legacy/build/pdf.mjs";
import type { PageText, Word } from "../rules/locate";

// The text a PDF prints, read straight from its text layer with pdf.js. No model is involved,
// so this is the independent record the model's reading is checked against.
// pdf.js measures from the bottom-left corner. The screen draws from the top-left, so y is flipped here.
export async function readPageText(pdf: Buffer): Promise<PageText> {
  const loading = getDocument({ data: new Uint8Array(pdf), verbosity: VerbosityLevel.ERRORS });
  try {
    const document = await loading.promise;
    const page = await document.getPage(1);
    const { width, height } = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const words: Word[] = [];
    for (const item of content.items) {
      if (!("str" in item) || item.str.trim() === "") continue;
      const [, , , , x = 0, baseline = 0] = item.transform as number[];
      words.push({
        text: item.str,
        x,
        y: height - baseline - item.height,
        width: item.width,
        height: item.height,
      });
    }
    return { width, height, words };
  } finally {
    await loading.destroy();
  }
}
