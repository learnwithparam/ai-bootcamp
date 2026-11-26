import type { LanguageModelUsage } from "ai";

// Puts values into a prompt file's {{name}} slots. A slot with no value is an error, never left blank.
export function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, name: string) => {
    const value = values[name];
    if (value === undefined) throw new Error(`The prompt needs a value for {{${name}}}.`);
    return value;
  });
}

// On OpenRouter a call's usage.raw.cost holds its price in dollars, web search included.
export function costOf(usage: LanguageModelUsage): number {
  return (usage.raw as { cost?: number } | undefined)?.cost ?? 0;
}
