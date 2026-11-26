import fixAFailingTest from "./skills/fix-a-failing-test/SKILL.md" with { type: "text" };
import keepTheChangeSmall from "./skills/keep-the-change-small/SKILL.md" with { type: "text" };

// Skills, in the SKILL.md format: a name and a one-line description up top, the full steps below.
// Only the names and descriptions go in the prompt. The agent loads a skill's steps with the skill tool
// when the task needs them, so a long skill costs nothing on a run that never uses it.

export type Skill = { name: string; description: string; body: string };

function readSkill(text: string): Skill {
  const [, head = "", body = ""] = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/) ?? [];
  const field = (key: string) => head.match(new RegExp(`^${key}: (.+)$`, "m"))?.[1]?.trim() ?? "";
  const skill = { name: field("name"), description: field("description"), body: body.trim() };
  if (!skill.name || !skill.description)
    throw new Error("A SKILL.md needs a name and a description at the top.");
  return skill;
}

export const SKILLS: Skill[] = [fixAFailingTest, keepTheChangeSmall].map(readSkill);

export function skillList(): string {
  return SKILLS.map((skill) => `- ${skill.name}: ${skill.description}`).join("\n");
}

export async function loadSkill(name: string) {
  const skill = SKILLS.find((each) => each.name === name);
  return skill
    ? { ok: true, output: skill.body }
    : { ok: false, output: `There is no skill called ${name}.` };
}
