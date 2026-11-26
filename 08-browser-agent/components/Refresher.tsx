"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// While a step runs, reload its data every two seconds. The page stops rendering this once it waits or ends.
export function Refresher() {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), 2000);
    return () => clearInterval(timer);
  }, [router]);
  return null;
}
