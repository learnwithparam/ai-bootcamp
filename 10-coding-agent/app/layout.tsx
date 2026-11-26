import "@bootcamp/ui/base.css";
import "../components/runs.css";
import "../components/replay.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Coding agent runs" };

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
