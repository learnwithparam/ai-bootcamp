import type { ReactNode } from "react";
import { AdminShell } from "../../components/AdminShell";
import { Assistant } from "../../components/Assistant";
import { CurrentPage } from "../../components/CurrentPage";
import { openDiscountDrafts } from "../../db/discounts";
import { newsletterFacts } from "../../db/newsletters";
import { requireTeam } from "../session";

// Every admin page sits in this shell. The assistant is mounted here once, so it keeps its conversation across pages.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const member = await requireTeam();
  const [drafts, letters] = await Promise.all([openDiscountDrafts(), newsletterFacts()]);
  return (
    <AdminShell user={member} waiting={{ discounts: drafts.length, newsletters: letters.waiting }}>
      <CurrentPage />
      {children}
      <Assistant />
    </AdminShell>
  );
}
