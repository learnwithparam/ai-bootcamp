// What a person should never read on a screen, web page or terminal alike:
// markdown left as raw text, or a tool's internal id. checkPage and the terminal's checkScreen both use it.

const RAW_MARKDOWN = /^#{1,6} |\]\(https?:|\*\*\S|`[^`\n]+`/m;
// A tool id such as learnwithparam__search_catalog, or a framework's own name such as LangGraph's __start__.
const RAW_TOOL_ID = /\b[a-z][a-z0-9]*__[a-z][a-z0-9_]*\b|(^|\s)__[a-z]+__(\s|$)/m;

// What a person should never read on a page. Returns the reason, or undefined when the text is clean.
export function rawTextProblem(text: string): string | undefined {
  const markdown = RAW_MARKDOWN.exec(text);
  if (markdown) return `shows raw markdown: "${markdown[0]}". Render it.`;
  const toolId = RAW_TOOL_ID.exec(text);
  if (toolId) return `shows a tool id: "${toolId[0].trim()}". Show its label.`;
  return undefined;
}
