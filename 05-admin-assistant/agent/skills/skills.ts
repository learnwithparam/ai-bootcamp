import { parseSkill, type Skill } from "../../rules/skill-file";
import coupons from "./coupons/SKILL.md" with { type: "text" };
import newsletter from "./newsletter/SKILL.md" with { type: "text" };
import reports from "./reports/SKILL.md" with { type: "text" };

// Every skill, read from its SKILL.md. Add a folder with a SKILL.md and list it here.
export const SKILLS: Skill[] = [reports, coupons, newsletter].map(parseSkill);

export function skillNamed(name: string): Skill | undefined {
  return SKILLS.find((skill) => skill.name === name);
}

// The one line per skill the model always sees. The instructions stay out of the prompt until the skill is loaded.
export function skillMenu(): string {
  return SKILLS.map((skill) => `- ${skill.name}: ${skill.description}`).join("\n");
}
