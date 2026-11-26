import { z } from "zod";
import { TOOLS } from "./all";

// What the tools page shows of each tool, built from its own input schema,
// so a new tool shows up on the page with no page change.

export type Field = { name: string; hint: string; required: boolean; choices: string[] | null };
export type ToolInfo = {
  name: string;
  title: string;
  description: string;
  personal: boolean;
  changesData: boolean;
  fields: Field[];
};

type Schema = {
  properties?: Record<string, { enum?: string[]; description?: string }>;
  required?: string[];
};

export function describeTools(): ToolInfo[] {
  return TOOLS.map((tool) => {
    const schema = z.toJSONSchema(tool.input) as Schema;
    const fields = Object.entries(schema.properties ?? {}).map(([name, property]) => ({
      name,
      hint: property.description ?? "",
      required: schema.required?.includes(name) ?? false,
      choices: property.enum ?? null,
    }));
    const { name, title, description, personal, changesData } = tool;
    return { name, title, description, personal, changesData, fields };
  });
}
