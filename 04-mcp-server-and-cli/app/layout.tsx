import "@bootcamp/ui/base.css";
import "../components/tools.css";
import type { ReactNode } from "react";

export const metadata = { title: "learnwithparam tools" };

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
