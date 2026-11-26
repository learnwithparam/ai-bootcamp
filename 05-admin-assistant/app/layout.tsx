import "@bootcamp/ui/base.css";
import "../components/admin.css";
import type { ReactNode } from "react";

export const metadata = { title: "Admin assistant" };

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
