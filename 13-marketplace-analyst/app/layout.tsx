import "@bootcamp/ui/base.css";
import "../components/analyst.css";
import "../components/evidence.css";
import "../components/evals.css";
import type { ReactNode } from "react";

export const metadata = { title: "Marketplace analyst" };

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
