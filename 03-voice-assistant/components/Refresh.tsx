"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// While a call is on the line, its page reads the transcript again every two seconds.
export function Refresh({ every = 2000 }: { every?: number }) {
  const router = useRouter();
  useEffect(() => {
    const tick = setInterval(() => router.refresh(), every);
    return () => clearInterval(tick);
  }, [router, every]);
  return null;
}
