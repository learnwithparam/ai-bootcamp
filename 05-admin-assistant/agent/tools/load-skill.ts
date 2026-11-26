import { tool } from "ai";
import { z } from "zod";
import { SKILLS, skillNamed } from "../skills/skills";

export type LoadSkillOutput = { name: string; tools: string[]; instructions: string } | { problem: string };

// The only tool switched on from the start. Loading a skill returns its instructions,
// and agent.ts switches on the skill's tools for the rest of the conversation.
export const loadSkill = tool({
  description: "Load a skill by name. Returns its instructions and switches on its tools.",
  inputSchema: z.object({ name: z.enum(SKILLS.map((skill) => skill.name) as [string, ...string[]]) }),
  execute: async ({ name }): Promise<LoadSkillOutput> => {
    const skill = skillNamed(name);
    if (!skill) return { problem: `There is no skill named ${name}.` };
    return { name: skill.name, tools: skill.allowedTools, instructions: skill.instructions };
  },
});
