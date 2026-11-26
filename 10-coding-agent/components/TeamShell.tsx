import {
  CircleCheck,
  Clock,
  Layers,
  type LucideIcon,
  MessageSquareWarning,
  SquareTerminal,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ROLE_LABEL, type Role, VIEWS, type View } from "../rules/review";
import { SignOut } from "./SignOut";

const ICONS: Record<View, LucideIcon> = {
  waiting: Clock,
  changes_requested: MessageSquareWarning,
  approved: CircleCheck,
  all: Layers,
};

type Person = { name: string; role: Role };
type Props = {
  person: Person;
  current: View | "terminal" | null;
  counts: Record<View, number>;
  children: ReactNode;
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

function ShellUser({ person }: { person: Person }) {
  return (
    <div className="shell-user">
      <span className="avatar" aria-hidden="true">
        {initials(person.name)}
      </span>
      <span className="shell-user-name">
        {person.name}
        <span>{ROLE_LABEL[person.role]}</span>
      </span>
      <SignOut />
    </div>
  );
}

function ViewLinks({ current, counts }: Pick<Props, "current" | "counts">) {
  return (Object.keys(VIEWS) as View[]).map((view) => {
    const Icon = ICONS[view];
    return (
      <Link
        key={view}
        href={view === "waiting" ? "/" : `/?view=${view}`}
        className="shell-link"
        aria-current={current === view ? "page" : undefined}
      >
        <Icon aria-hidden="true" /> {VIEWS[view]}
        <span className="shell-count">{counts[view]}</span>
      </Link>
    );
  });
}

// The team's review site, shaped like a pull request queue: the review states down the side, with counts.
export function TeamShell({ person, current, counts, children }: Props) {
  return (
    <div className="shell">
      <nav className="shell-nav" aria-label="Agent runs">
        <Link href="/" className="shell-brand">
          <span className="shell-brand-mark">ms</span> Agent runs
        </Link>
        <span className="shell-section">Review</span>
        <ViewLinks current={current} counts={counts} />
        <span className="shell-section">Run the agent</span>
        <Link
          href="/terminal"
          className="shell-link"
          aria-current={current === "terminal" ? "page" : undefined}
        >
          <SquareTerminal aria-hidden="true" /> From the terminal
        </Link>
        <ShellUser person={person} />
      </nav>
      <main className="shell-main">{children}</main>
    </div>
  );
}
