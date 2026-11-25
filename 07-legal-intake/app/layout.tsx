import "@bootcamp/ui/base.css";
import "../components/firm.css";
import "../components/intake.css";
import type { ReactNode } from "react";

export const metadata = { title: "Harlow Legal" };

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
