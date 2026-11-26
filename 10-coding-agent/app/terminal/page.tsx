import { TeamShell } from "../../components/TeamShell";
import { tabCounts } from "../../db/runs";
import { requireMember } from "../session";

export const dynamic = "force-dynamic";

const STEPS: { title: string; command: string; note: string }[] = [
  {
    title: "Sign in from the terminal",
    command: "bun run code login",
    note: "Use the same email and password as this site. The password is never shown as you type.",
  },
  {
    title: "Try a practice task",
    command: "bun run code practice months",
    note: "The agent gets a fresh copy of vercel/ms with failing tests, and works until the tests pass or it runs out of steps.",
  },
  {
    title: "Or give it your own task",
    command: 'bun run code run "make the date test pass" --repo ../my-app --check "bun test"',
    note: "Your repo must be a git repo with nothing uncommitted, so the change it makes is easy to see and undo.",
  },
  {
    title: "Send the run here for review",
    command: "bun run code upload",
    note: "This sends your newest session file. A reviewer replays it, reads the change, then approves it or asks for changes.",
  },
];

export default async function TerminalPage() {
  const person = await requireMember();
  return (
    <TeamShell person={person} current="terminal" counts={await tabCounts()}>
      <header className="page-header">
        <div>
          <h1>Run the agent from the terminal</h1>
          <p>
            The agent works in your repo on your machine. This site only shows what it did, after you send it.
          </p>
        </div>
      </header>
      <ol className="terminal-steps">
        {STEPS.map((step) => (
          <li key={step.title} className="panel terminal-step">
            <h2>{step.title}</h2>
            <pre className="terminal-command">
              <code>{step.command}</code>
            </pre>
            <p>{step.note}</p>
          </li>
        ))}
      </ol>
      {person.role === "reviewer" && (
        <p className="form-hint">
          Reviewers can run the agent too, but only developers can send runs for review.
        </p>
      )}
    </TeamShell>
  );
}
