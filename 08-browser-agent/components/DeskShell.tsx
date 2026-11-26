import { Archive, Bot, History, Inbox, type LucideIcon, Send, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ROLE_LABEL, type Role, VIEWS, type View } from "../rules/team";
import { SignOut } from "./SignOut";

const ICONS: Record<View, LucideIcon> = {
  inbox: Inbox,
  approvals: ShieldCheck,
  working: Bot,
  sent: Send,
  closed: Archive,
};

type Person = { name: string; role: Role };
type Props = { person: Person; current: View | "history"; counts: Record<View, number>; children: ReactNode };

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

// The firm's intake desk, shaped like a shared inbox: the views down the side, each with how many emails are in it.
export function DeskShell({ person, current, counts, children }: Props) {
  return (
    <div className="shell">
      <nav className="shell-nav" aria-label="Intake desk">
        <Link href="/" className="shell-brand">
          <span className="shell-brand-mark">H</span> Harlow Legal
        </Link>
        <span className="shell-section">Client emails</span>
        <ViewLinks current={current} counts={counts} />
        <span className="shell-section">Agent</span>
        <Link href="/runs" className="shell-link" aria-current={current === "history" ? "page" : undefined}>
          <History aria-hidden="true" /> Run history
        </Link>
        <UserCard person={person} />
      </nav>
      <main className="shell-main">{children}</main>
    </div>
  );
}

function ViewLinks({ current, counts }: Pick<Props, "current" | "counts">) {
  return (Object.keys(VIEWS) as View[]).map((view) => {
    const Icon = ICONS[view];
    return (
      <Link
        key={view}
        href={view === "inbox" ? "/" : `/?view=${view}`}
        className="shell-link"
        aria-current={current === view ? "page" : undefined}
      >
        <Icon aria-hidden="true" /> {VIEWS[view]}
        <span className="shell-count">{counts[view]}</span>
      </Link>
    );
  });
}

function UserCard({ person }: { person: Person }) {
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
