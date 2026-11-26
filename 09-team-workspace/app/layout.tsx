import "@bootcamp/ui/base.css";
import "../components/workspace.css";
import type { ReactNode } from "react";

export const metadata = { title: "Team workspace" };

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
