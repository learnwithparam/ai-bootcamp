import "@bootcamp/ui/base.css";
import "../components/inbox.css";
import type { ReactNode } from "react";

export const metadata = { title: "Invoice inbox" };

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
