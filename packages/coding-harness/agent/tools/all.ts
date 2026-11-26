import { tool } from "ai";
import { z } from "zod";
import { checkCommand } from "../../rules/commands";
import { loadSkill, SKILLS } from "../skills";
import { editTool, readTool, type ToolAnswer, writeTool } from "./files";
import { runProgram } from "./run";

// The agent's tools, like Pi's: read, write, edit and bash, plus skill and done.
// None has an execute function. The model only asks for a call, and agent.ts decides whether it runs.

export const TOOLS = {
  read: tool({
    description: "Read a file in the repo. Lines come back numbered.",
    inputSchema: z.object({ path: z.string().describe("A path inside the repo, such as src/index.ts") }),
  }),
  write: tool({
    description: "Create a file, or replace all of it. Use edit to change part of a file.",
    inputSchema: z.object({ path: z.string(), content: z.string() }),
  }),
  edit: tool({
    description: "Replace one exact piece of a file. old_text must appear in the file exactly once.",
    inputSchema: z.object({ path: z.string(), old_text: z.string(), new_text: z.string() }),
  }),
  bash: tool({
    description:
      "Run one program in the repo, such as ls, grep, git diff or bun test. No pipes, no ; or &&, and no redirects.",
    inputSchema: z.object({ command: z.string() }),
  }),
  skill: tool({
    description: "Load a skill's full instructions by its name, from the list in your instructions.",
    inputSchema: z.object({ name: z.enum(SKILLS.map((each) => each.name) as [string, ...string[]]) }),
  }),
  done: tool({
    description:
      "Say the work is done. This runs the check. If it fails you get the output and keep working.",
    inputSchema: z.object({
      summary: z.string().describe("One or two sentences on what you changed and why"),
    }),
  }),
};

export type ToolName = keyof typeof TOOLS;

// A model can ask for a call its own tool list does not allow, such as read with no path. The call is
// answered with what was wrong, so the model can ask again, instead of reaching the tool and breaking the run.
export function checkInput(name: string, input: unknown): string | null {
  const spec = TOOLS[name as ToolName];
  if (!spec) return `There is no tool called ${name}.`;
  const parsed = (spec.inputSchema as z.ZodType).safeParse(input);
  if (parsed.success) return null;
  const wrong = parsed.error.issues.map(
    (issue) => `${issue.path.join(".") || "the input"}: ${issue.message}`,
  );
  return `The call to ${name} was not complete (${wrong.join("; ")}). Call it again with every field.`;
}

async function bashTool(repo: string, input: { command: string }): Promise<ToolAnswer> {
  const verdict = checkCommand(input.command);
  if (!verdict.ok) return { ok: false, output: verdict.reason };
  const ran = await runProgram(verdict.argv, repo);
  return { ok: ran.exitCode === 0, output: `exit code ${ran.exitCode}\n${ran.output || "(no output)"}` };
}

// Runs every tool but done, which agent.ts handles because it can end the run.
export async function runTool(
  name: string,
  input: Record<string, unknown>,
  repo: string,
): Promise<ToolAnswer> {
  const args = input as never;
  if (name === "read") return readTool(repo, args);
  if (name === "write") return writeTool(repo, args);
  if (name === "edit") return editTool(repo, args);
  if (name === "bash") return bashTool(repo, args);
  if (name === "skill") return loadSkill(String(input.name));
  return { ok: false, output: `There is no tool called ${name}.` };
}
