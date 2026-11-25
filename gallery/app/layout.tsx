import "@bootcamp/ui/base.css";
import "./gallery.css";
import type { ReactNode } from "react";

export const metadata = { title: "AI Bootcamp: ten AI products you can run and read" };

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
