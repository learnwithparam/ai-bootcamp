import "@bootcamp/ui/base.css";
import "../components/inbox.css";
import "../components/run.css";
import "../components/checkpoint.css";
import type { ReactNode } from "react";

export const metadata = { title: "Browser agent" };

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
