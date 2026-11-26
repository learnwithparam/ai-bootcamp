import { BookUser, Inbox } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { Role } from "../rules/board";
import { SignOut } from "./SignOut";

type Props = {
  user: { name: string; role: Role };
  current: "board" | "records";
  open: number;
  children: ReactNode;
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

// The firm's app: a side nav with the intake board and the records the conflict check reads, and who is signed in.
export function FirmShell({ user, current, open, children }: Props) {
  return (
    <div className="shell">
      <nav className="shell-nav" aria-label="Firm">
        <Link href="/queue" className="shell-brand">
          <span className="shell-brand-mark firm-brand-mark">H</span> Harlow Legal
        </Link>
        <span className="shell-section">Intake</span>
        <Link href="/queue" className="shell-link" aria-current={current === "board" ? "page" : undefined}>
          <Inbox aria-hidden="true" /> Intake board <span className="shell-count">{open}</span>
        </Link>
        <Link
          href="/records"
          className="shell-link"
          aria-current={current === "records" ? "page" : undefined}
        >
          <BookUser aria-hidden="true" /> Conflict records
        </Link>
        <div className="shell-user">
          <span className="avatar" aria-hidden="true">
            {initials(user.name)}
          </span>
          <span className="shell-user-name">
            {user.name}
            <span>{user.role === "lawyer" ? "Lawyer" : "Paralegal"}</span>
          </span>
          <SignOut />
        </div>
      </nav>
      <main className="shell-main">{children}</main>
    </div>
  );
}
