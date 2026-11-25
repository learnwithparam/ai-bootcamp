"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// While the assistant is reading a bill, reload the page every two seconds. The page stops rendering this once it is done.
export function Refresher() {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), 2000);
    return () => clearInterval(timer);
  }, [router]);
  return null;
}
