"use client";

import { authClient } from "@bootcamp/auth/client";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export function SignOut() {
  const router = useRouter();
  async function signOut() {
    await authClient.signOut();
    router.push("/sign-in");
  }
  return (
    <button
      type="button"
      className="button button-quiet shell-signout"
      onClick={signOut}
      aria-label="Sign out"
    >
      <LogOut aria-hidden="true" />
    </button>
  );
}
