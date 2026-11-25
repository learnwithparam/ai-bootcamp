import "@bootcamp/ui/base.css";
import "../components/intake.css";
import type { ReactNode } from "react";

export const metadata = { title: "Legal intake" };

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
