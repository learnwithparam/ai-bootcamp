import { type CheckResult, readTestOutput } from "../rules/check";
import { checkCommand } from "../rules/commands";
import { runProgram } from "./tools/run";

// The counts sit at the end of the test output, so the check reads all of it and readTestOutput shortens it after.
const FULL_OUTPUT = 2_000_000;

// The check is the harness's own test run. The model never decides it passed: this exit code does.
export async function runCheck(command: string, repo: string): Promise<CheckResult> {
  const verdict = checkCommand(command);
  if (!verdict.ok) throw new Error(`The check command is not allowed: ${verdict.reason}`);
  const ran = await runProgram(verdict.argv, repo, FULL_OUTPUT);
  return readTestOutput(ran.output, ran.timedOut ? 1 : ran.exitCode);
}

const MAX_DIFF = 500_000;

// Every change the run made, new files included, as a reviewer reads it.
export async function changesSoFar(repo: string): Promise<string> {
  await runProgram(["git", "add", "--intent-to-add", "--all"], repo);
  const ran = await runProgram(["git", "diff", "--no-color", "--no-ext-diff"], repo, MAX_DIFF);
  if (ran.exitCode !== 0) throw new Error(`git diff failed in ${repo}: ${ran.output}`);
  return ran.output;
}
