import "@bootcamp/ui/base.css";
import "../components/shop.css";
import "../components/sections.css";
import "../components/pages.css";
import type { ReactNode } from "react";

export const metadata = { title: "Fernhill Grocer" };

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
