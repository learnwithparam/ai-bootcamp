import { mkdir, rm } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import { repoName } from "../rules/labels";
import { PRACTICE_REPO, type PracticeTask } from "../rules/tasks";
import { runProgram } from "./tools/run";

// Where the CLI keeps its files: one copy of the practice repo, a fresh folder per run, and the session files.
// It sits outside this repo, so the agent's work never mixes with the course code.

export const HOME = join(homedir(), ".config", "coding-agent");
export const SESSIONS = join(HOME, "sessions");
const MIRROR = join(HOME, "mirror", "ms");
const AUTHOR = [
  "-c",
  "user.name=Coding agent setup",
  "-c",
  "user.email=setup@coding-seed.learnwithparam.test",
];

// Where a run happens: the folder the agent works in, the commit it starts from, and the repo's public name.
// Only the name goes into the session file, so an upload never carries a path from someone's machine.
export type Place = { repo: string; commit: string; name: string };

async function git(args: string[], cwd: string): Promise<string> {
  const ran = await runProgram(["git", ...args], cwd);
  if (ran.exitCode !== 0) throw new Error(`git ${args[0]} failed: ${ran.output}`);
  return ran.output.trim();
}

export async function cloneOnce(): Promise<void> {
  const exists = await Bun.file(join(MIRROR, "HEAD")).exists();
  if (exists) return;
  await mkdir(join(HOME, "mirror"), { recursive: true });
  await git(["clone", "--quiet", "--bare", PRACTICE_REPO, MIRROR], HOME);
}

// A fresh folder at the commit before the real fix, with the fix's tests committed as the starting point.
export async function prepare(task: PracticeTask, name: string): Promise<Place> {
  await cloneOnce();
  const repo = join(HOME, "workspaces", name);
  await rm(repo, { recursive: true, force: true });
  await git(["worktree", "prune"], MIRROR);
  await git(["worktree", "add", "--quiet", "--detach", repo, task.base], MIRROR);
  if (task.tests.length > 0) {
    await git(["checkout", task.testsFrom, "--", ...task.tests], repo);
    await git([...AUTHOR, "commit", "--quiet", "-m", `Add the tests for: ${task.title}`], repo);
  }
  return { repo, commit: await git(["rev-parse", "HEAD"], repo), name: repoName(PRACTICE_REPO) };
}

// For your own repo: it must be a git repo with nothing uncommitted, so the diff shows only the agent's work.
export async function ownRepo(repo: string): Promise<Place> {
  const changed = await git(["status", "--porcelain"], repo).catch(() => {
    throw new Error(`${repo} is not a git repo. Run the agent inside one.`);
  });
  if (changed)
    throw new Error("Commit or put aside your own changes first, so the diff shows only the agent's work.");
  const remote = await git(["remote", "get-url", "origin"], repo).catch(() => "");
  return {
    repo,
    commit: await git(["rev-parse", "HEAD"], repo),
    name: remote ? repoName(remote) : basename(repo),
  };
}
