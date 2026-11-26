"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// Marks the nav link for the page that is open. The shell is drawn once by the layout, so this runs on each move.
export function CurrentPage() {
  const path = usePathname();
  useEffect(() => {
    for (const link of document.querySelectorAll<HTMLAnchorElement>("[data-nav]")) {
      const href = link.dataset.nav ?? "";
      const current = href === "/" ? path === "/" : path.startsWith(href);
      if (current) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    }
  }, [path]);
  return null;
}
