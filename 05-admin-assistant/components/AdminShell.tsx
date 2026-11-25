import { Activity, House, Mail, TicketPercent, Users } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { SignOut } from "./SignOut";

type Props = {
  user: { name: string; role: "owner" | "staff" };
  waiting: { discounts: number; newsletters: number };
  children: ReactNode;
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const LINKS = [
  { href: "/", label: "Home", icon: House, count: null },
  { href: "/customers", label: "Customers", icon: Users, count: null },
  { href: "/discounts", label: "Discounts", icon: TicketPercent, count: "discounts" },
  { href: "/newsletters", label: "Newsletters", icon: Mail, count: "newsletters" },
  { href: "/activity", label: "Activity", icon: Activity, count: null },
] as const;

// The store admin: a side nav like Shopify's, the counts of drafts waiting for an owner, and who is signed in.
// The nav links are plain links; NavLinks marks the current page on the client.
export function AdminShell({ user, waiting, children }: Props) {
  return (
    <div className="shell">
      <nav className="shell-nav" aria-label="Admin">
        <Link href="/" className="shell-brand">
          <span className="shell-brand-mark">L</span> learnwithparam
        </Link>
        <span className="shell-section">Store</span>
        {LINKS.map(({ href, label, icon: Icon, count }) => (
          <Link key={href} href={href} className="shell-link" data-nav={href}>
            <Icon aria-hidden="true" /> {label}
            {count && waiting[count] > 0 ? <span className="shell-count">{waiting[count]}</span> : null}
          </Link>
        ))}
        <div className="shell-user">
          <span className="avatar" aria-hidden="true">
            {initials(user.name)}
          </span>
          <span className="shell-user-name">
            {user.name}
            <span>{user.role === "owner" ? "Owner" : "Staff"}</span>
          </span>
          <SignOut />
        </div>
      </nav>
      <main className="shell-main">{children}</main>
    </div>
  );
}
