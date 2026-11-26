import { AppWindow, ArrowLeftRight, Eye, PencilLine, Terminal } from "lucide-react";
import type { ReactNode } from "react";
import { TOOLS } from "../agent/tools/all";
import { scopeWords } from "../rules/plain";

// ["Know it is you", "See your name"] reads "Know it is you, see your name."
const asSentence = (phrases: string[]) =>
  `${phrases.map((phrase, index) => (index ? phrase.toLowerCase() : phrase)).join(", ")}.`;

type Props = {
  appName: string;
  // Where the app runs: the terminal (the CLI's code sign-in) or a web or desktop app (the browser sign-in).
  from: "terminal" | "app";
  email: string;
  scopes: string[];
  children: ReactNode;
};

// The one moment a person hands their account to an app, so it says exactly what the app gets:
// every tool by name, marked read-only or changes data, and what it learns about the account.
export function GrantCard({ appName, from, email, scopes, children }: Props) {
  const AppIcon = from === "terminal" ? Terminal : AppWindow;
  return (
    <main className="grant">
      <div className="grant-marks" aria-hidden="true">
        <span className="grant-mark">
          <AppIcon />
        </span>
        <ArrowLeftRight className="grant-link" />
        <span className="grant-mark grant-mark-ours">L</span>
      </div>
      <h1>Let {appName} use your tools?</h1>
      <p className="grant-who">
        Signed in as <strong>{email}</strong>
      </p>
      <h2>It can run, as you</h2>
      <ul className="grant-list">
        {TOOLS.map((tool) => (
          <li key={tool.name}>
            {tool.changesData ? <PencilLine aria-hidden="true" /> : <Eye aria-hidden="true" />}
            {tool.title}
            <span>{tool.changesData ? "Changes data" : "Read-only"}</span>
          </li>
        ))}
      </ul>
      <h2>It can also</h2>
      <p className="grant-scopes">{asSentence(scopeWords(scopes))}</p>
      {children}
      <p className="grant-foot">You can revoke it any time on the Connected apps page.</p>
    </main>
  );
}
