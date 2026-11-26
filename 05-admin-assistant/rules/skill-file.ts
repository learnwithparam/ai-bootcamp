// Reads a SKILL.md file: a short header between --- lines, then the instructions.
//   name: coupons
//   description: one line the model reads to decide whether it needs this skill
//   allowed-tools: list_coupons, create_coupon
// This is the same layout Claude's own skills use.

export type Skill = { name: string; description: string; allowedTools: string[]; instructions: string };

const FILE = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;

export function parseSkill(text: string): Skill {
  const match = FILE.exec(text.replace(/\r\n/g, "\n"));
  if (!match) throw new Error("A SKILL.md must start with a header between two --- lines.");
  const [, header = "", instructions = ""] = match;
  const fields = new Map(
    header.split("\n").map((line) => {
      const colon = line.indexOf(":");
      return [line.slice(0, colon).trim(), line.slice(colon + 1).trim()] as const;
    }),
  );
  const name = fields.get("name");
  const description = fields.get("description");
  if (!name || !description) throw new Error("A SKILL.md header needs a name and a description.");
  const allowedTools = (fields.get("allowed-tools") ?? "")
    .split(",")
    .map((tool) => tool.trim())
    .filter(Boolean);
  return { name, description, allowedTools, instructions: instructions.trim() };
}
