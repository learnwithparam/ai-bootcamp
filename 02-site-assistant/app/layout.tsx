import "@bootcamp/ui/base.css";
import "../components/assistant.css";
import type { ReactNode } from "react";

export const metadata = { title: "Ask learnwithparam" };

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
