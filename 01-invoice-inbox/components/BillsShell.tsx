import { CheckCheck, CircleDollarSign, Files, Inbox, ReceiptText } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { Member } from "../app/session";
import { type BillStatus, TABS, type Tab } from "../rules/bill";
import { SignOut } from "./SignOut";

const ICONS: Record<Tab, typeof Inbox> = {
  review: Inbox,
  approval: CheckCheck,
  payment: CircleDollarSign,
  paid: ReceiptText,
  all: Files,
};

type Props = {
  member: Member;
  current: Tab | null;
  counts: Partial<Record<BillStatus, number>>;
  children: ReactNode;
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export const countIn = (tab: Tab, counts: Props["counts"]) =>
  TABS[tab].statuses.reduce((sum, status) => sum + (counts[status] ?? 0), 0);

// The accounts payable app: the bill queues down the side, each with how many bills wait in it.
export function BillsShell({ member, current, counts, children }: Props) {
  return (
    <div className="shell">
      <nav className="shell-nav" aria-label="Bills">
        <Link href="/bills" className="shell-brand">
          <span className="shell-brand-mark bills-brand-mark">L</span> Larder Group
        </Link>
        <span className="shell-section">Bills</span>
        {(Object.keys(TABS) as Tab[]).map((tab) => {
          const Icon = ICONS[tab];
          return (
            <Link
              key={tab}
              href={`/bills?tab=${tab}`}
              className="shell-link"
              aria-current={current === tab ? "page" : undefined}
            >
              <Icon aria-hidden="true" /> {TABS[tab].label}
              {tab !== "all" && tab !== "paid" ? (
                <span className="shell-count">{countIn(tab, counts)}</span>
              ) : null}
            </Link>
          );
        })}
        <div className="shell-user">
          <span className="avatar" aria-hidden="true">
            {initials(member.name)}
          </span>
          <span className="shell-user-name">
            {member.name}
            <span>{member.role === "approver" ? "Finance approver" : "AP clerk"}</span>
          </span>
          <SignOut />
        </div>
      </nav>
      <main className="shell-main">{children}</main>
    </div>
  );
}
