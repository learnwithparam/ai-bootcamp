import "@bootcamp/ui/base.css";
import "../components/phone.css";
import "../components/desk.css";
import type { ReactNode } from "react";

export const metadata = { title: "Harbour Physio" };

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
