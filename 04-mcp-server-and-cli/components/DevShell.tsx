import { Activity, KeyRound, LogIn, Wrench } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { SignOut } from "./SignOut";

export type Page = "tools" | "apps" | "activity";

const PAGES: { page: Page; href: string; label: string; Icon: typeof Wrench }[] = [
  { page: "tools", href: "/", label: "Tools", Icon: Wrench },
  { page: "apps", href: "/apps", label: "Connected apps", Icon: KeyRound },
  { page: "activity", href: "/activity", label: "Activity", Icon: Activity },
];

type User = { name: string; email: string } | null;

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

// The signed-in person, or a sign-in button that comes back to this page.
function UserBox({ user, current }: { user: User; current: Page }) {
  if (!user)
    return (
      <div className="shell-user">
        <Link
          href={`/sign-in?next=${PAGES.find((each) => each.page === current)?.href ?? "/"}`}
          className="button"
        >
          <LogIn aria-hidden="true" /> Sign in
        </Link>
      </div>
    );
  return (
    <div className="shell-user">
      <span className="avatar" aria-hidden="true">
        {initials(user.name)}
      </span>
      <span className="shell-user-name">
        {user.name}
        <span title={user.email}>{user.email}</span>
      </span>
      <SignOut />
    </div>
  );
}

// The developer settings of learnwithparam: the tools, the apps that act for you, and every call they made.
export function DevShell({ user, current, children }: { user: User; current: Page; children: ReactNode }) {
  return (
    <div className="shell">
      <nav className="shell-nav" aria-label="Developers">
        <Link href="/" className="shell-brand">
          <span className="shell-brand-mark">L</span> learnwithparam
        </Link>
        <span className="shell-section">Developers</span>
        {PAGES.map(({ page, href, label, Icon }) => (
          <Link
            key={page}
            href={href}
            className="shell-link"
            aria-current={current === page ? "page" : undefined}
          >
            <Icon aria-hidden="true" /> {label}
          </Link>
        ))}
        <UserBox user={user} current={current} />
      </nav>
      <main className="shell-main">{children}</main>
    </div>
  );
}
