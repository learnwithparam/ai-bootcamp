"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { authClient } from "./client";

// The bar across the top of every product: its name, any links it adds, and who is signed in.
// With no user it offers Sign in instead of Sign out.
export function Topbar({
  title,
  userName,
  children,
}: {
  title: string;
  userName?: string;
  children?: ReactNode;
}) {
  const router = useRouter();
  async function signOut() {
    await authClient.signOut();
    router.push("/sign-in");
  }
  return (
    <header className="topbar">
      <Link href="/" className="topbar-title">
        {title}
      </Link>
      <span className="topbar-user">
        {children}
        {userName}
      </span>
      {userName ? (
        <button type="button" className="button" onClick={signOut}>
          Sign out
        </button>
      ) : (
        <Link href="/sign-in" className="button">
          Sign in
        </Link>
      )}
    </header>
  );
}
