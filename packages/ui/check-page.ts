import AxeBuilder from "@axe-core/playwright";
import type { Page } from "playwright";

// Every e2e test calls this on each screen it reaches. It fails on what a person should never see:
// markdown left as raw text, a tool's internal id, or a page a screen reader cannot use.
// check-products.ts fails any product whose e2e test does not call it.

const RAW_MARKDOWN = /^#{1,6} |\]\(https?:|\*\*\S/m;
const RAW_TOOL_ID = /\b[a-z][a-z0-9]*__[a-z][a-z0-9_]*\b/;

// What a person should never read on a page. Returns the reason, or undefined when the text is clean.
export function rawTextProblem(text: string): string | undefined {
  const markdown = RAW_MARKDOWN.exec(text);
  if (markdown) return `shows raw markdown: "${markdown[0]}". Render it.`;
  const toolId = RAW_TOOL_ID.exec(text);
  if (toolId) return `shows a tool id: "${toolId[0]}". Show its label.`;
  return undefined;
}

export async function checkPage(page: Page): Promise<void> {
  // innerText, not textContent: what a person sees, line by line, without script or hidden text.
  // biome-ignore lint/performance/useDomNodeTextContent: the check reads rendered text on purpose
  const problem = rawTextProblem(await page.locator("body").innerText());
  if (problem) throw new Error(`${page.url()} ${problem}`);
  const { violations } = await new AxeBuilder({ page }).analyze();
  if (violations.length) {
    const list = violations.map((each) => `${each.id} (${each.nodes.length}): ${each.help}`);
    throw new Error(`${page.url()} has accessibility problems:\n${list.join("\n")}`);
  }
}
