import "@bootcamp/ui/base.css";
import "../components/accounts.css";
import "../components/research.css";
import type { ReactNode } from "react";

export const metadata = { title: "Research agent" };

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
