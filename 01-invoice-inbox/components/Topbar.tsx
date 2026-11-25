"use client";

import { authClient } from "@bootcamp/auth/client";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function Topbar({ userName }: { userName: string }) {
  const router = useRouter();
  async function signOut() {
    await authClient.signOut();
    router.push("/sign-in");
  }
  return (
    <header className="topbar">
      <Link href="/" className="topbar-title">
        Invoice inbox
      </Link>
      <span className="topbar-user">{userName}</span>
      <button type="button" className="button" onClick={signOut}>
        Sign out
      </button>
    </header>
  );
}
