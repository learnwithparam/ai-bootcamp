import { Archive, Hand, Inbox, type LucideIcon, Sparkles, UserRound } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { VIEWS, type View } from "../rules/conversation";
import { initials } from "./initials";
import { SignOut } from "./SignOut";

const ICONS: Record<View, LucideIcon> = {
  waiting: Hand,
  mine: UserRound,
  team: Inbox,
  assistant: Sparkles,
  closed: Archive,
};

type Props = { name: string; current: View; counts: Record<View, number>; children: ReactNode };

// The support inbox, shaped like Intercom's: the views down the side, each with how many conversations are in it.
export function InboxShell({ name, current, counts, children }: Props) {
  return (
    <div className="shell">
      <nav className="shell-nav" aria-label="Support inbox">
        <Link href="/" className="shell-brand">
          <span className="shell-brand-mark">L</span> learnwithparam
        </Link>
        <span className="shell-section">Inbox</span>
        {(Object.keys(VIEWS) as View[]).map((view) => {
          const Icon = ICONS[view];
          return (
            <Link
              key={view}
              href={`/inbox?view=${view}`}
              className="shell-link"
              aria-current={current === view ? "page" : undefined}
            >
              <Icon aria-hidden="true" /> {VIEWS[view]}
              <span className="shell-count">{counts[view]}</span>
            </Link>
          );
        })}
        <div className="shell-user">
          <span className="avatar" aria-hidden="true">
            {initials(name)}
          </span>
          <span className="shell-user-name">
            {name}
            <span>Support team</span>
          </span>
          <SignOut />
        </div>
      </nav>
      <main className="shell-main inbox-main">{children}</main>
    </div>
  );
}
