import type { ReactNode } from "react";
import { requireTeam } from "../session";

export default async function MerchandisingLayout({ children }: { children: ReactNode }) {
  const member = await requireTeam();
  return (
    <div className="shell">
      <nav className="shell-nav" aria-label="Merchandising">
        <a className="shell-brand" href="/merchandising">
          Fernhill Grocer
        </a>
        <a className="shell-link" href="/merchandising">
          Personalizations
        </a>
        <a className="shell-link" href="/">
          The shop
        </a>
        <p className="shell-user">{member.name}</p>
      </nav>
      <main className="shell-main">{children}</main>
    </div>
  );
}
