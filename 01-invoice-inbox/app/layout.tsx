import "@bootcamp/ui/base.css";
import "../components/bills.css";
import type { ReactNode } from "react";

export const metadata = { title: "Larder Group bills" };

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
