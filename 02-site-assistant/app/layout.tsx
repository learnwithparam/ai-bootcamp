import "@bootcamp/ui/base.css";
import "../components/site.css";
import "../components/messenger.css";
import "../components/thread.css";
import "../components/inbox.css";
import type { ReactNode } from "react";

export const metadata = { title: "learnwithparam: video courses on building AI agents" };

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
