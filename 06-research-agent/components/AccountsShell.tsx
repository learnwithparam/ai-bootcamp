import { Building2, Inbox, UserRound } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { Member } from "../app/session";
import { ROLE_LABEL, VIEWS, type View } from "../rules/team";
import { SignOut } from "./SignOut";

const ICONS: Record<View, typeof Inbox> = { all: Building2, mine: UserRound, unassigned: Inbox };

type Props = { member: Member; current: View | null; counts: Record<View, number>; children: ReactNode };

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

// The sales team's prospecting app: the account views down the side, each with how many accounts are in it.
export function AccountsShell({ member, current, counts, children }: Props) {
  return (
    <div className="shell">
      <nav className="shell-nav" aria-label="Accounts">
        <Link href="/accounts" className="shell-brand">
          <span className="shell-brand-mark">L</span> learnwithparam
        </Link>
        <span className="shell-section">Prospecting</span>
        {(Object.keys(VIEWS) as View[]).map((view) => {
          const Icon = ICONS[view];
          return (
            <Link
              key={view}
              href={view === "all" ? "/accounts" : `/accounts?view=${view}`}
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
            {initials(member.name)}
          </span>
          <span className="shell-user-name">
            {member.name}
            <span>{ROLE_LABEL[member.role]}</span>
          </span>
          <SignOut />
        </div>
      </nav>
      <main className="shell-main">{children}</main>
    </div>
  );
}
