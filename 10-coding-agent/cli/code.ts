import { resolve } from "node:path";
import { startTracing } from "@bootcamp/tracing";
import { runAgent } from "../agent/agent";
import { CHECK_COMMAND, findTask, PRACTICE_TASKS } from "../agent/tasks";
import { ownRepo, type Place, prepare } from "../agent/workspace";
import { readAccount, signIn, signOut } from "./account";
import { ask, askHidden } from "./ask";
import { newSessionFile } from "./session-file";
import { printEvent } from "./trace";
import { upload } from "./upload";

// The coding agent in your terminal. Run it from the repo root:
//   bun run code practice months        a real task in a fresh copy of vercel/ms
//   bun run code run "<task>" --repo .   your own task in your own git repo
//   bun run code login | upload | logout

const HELP = `Commands:
  practice <${PRACTICE_TASKS.map((each) => each.slug).join("|")}>   run a practice task in a fresh copy of vercel/ms
  run "<task>" --repo <path> [--check "<command>"]   run your own task in your own git repo
  login     sign in to the review site
  upload    send your latest run to the review site
  logout    forget the saved sign-in`;

function option(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

async function work(task: string, place: Place, check: string) {
  startTracing();
  const session = newSessionFile();
  const spent = { cost: 0 };
  await runAgent({ task, ...place, check }, (event) => {
    session.write(event);
    printEvent(event, spent);
  });
  console.log(`Session file: ${session.path}`);
  console.log("Send it for review with: bun run code upload");
}

async function login() {
  const email = await ask("Email: ");
  const account = await signIn(email, await askHidden("Password: "));
  console.log(`Signed in to ${account.site} as ${account.email}.`);
}

const COMMANDS: Record<string, (args: string[]) => Promise<void>> = {
  practice: async ([slug = ""]) => {
    const task = findTask(slug);
    await work(task.task, await prepare(task, `${task.slug}-${Date.now()}`), CHECK_COMMAND);
  },
  run: async (args) => {
    const [task] = args;
    if (!task)
      throw new Error('Say what to do, for example: bun run code run "fix the failing test" --repo .');
    const repo = resolve(option(args, "--repo") ?? ".");
    await work(task, await ownRepo(repo), option(args, "--check") ?? CHECK_COMMAND);
  },
  login: () => login(),
  upload: async ([path]) => console.log(`Uploaded. Open it at ${await upload(path)}`),
  logout: async () => {
    await signOut();
    console.log("Signed out.");
  },
  whoami: async () => console.log((await readAccount())?.email ?? "Not signed in."),
};

const [name = "", ...rest] = process.argv.slice(2);
const command = COMMANDS[name];
if (!command) {
  console.log(HELP);
  process.exit(name ? 1 : 0);
}
await command(rest).catch((error: Error) => {
  console.error(error.message);
  process.exit(1);
});
process.exit(0);
