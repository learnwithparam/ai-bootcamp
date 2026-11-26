import type { ReactNode } from "react";
import { SignOut } from "../../components/SignOut";
import { requireTeam } from "../session";

export default async function DeskLayout({ children }: { children: ReactNode }) {
  const member = await requireTeam();
  return (
    <div className="shell">
      <nav className="shell-nav" aria-label="Front desk">
        <a className="shell-brand" href="/desk">
          Harbour Physio
        </a>
        <a className="shell-link" href="/desk">
          Today
        </a>
        <a className="shell-link" href="/desk/diary">
          Diary
        </a>
        <a className="shell-link" href="/">
          The phone line
        </a>
        <p className="shell-user">{member.name}</p>
        <SignOut />
      </nav>
      <main className="shell-main">{children}</main>
    </div>
  );
}
