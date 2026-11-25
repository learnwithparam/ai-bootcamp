import "@bootcamp/ui/base.css";
import "../components/agent.css";
import type { ReactNode } from "react";

export const metadata = { title: "Browser agent" };

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
