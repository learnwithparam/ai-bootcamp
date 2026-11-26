"use client";

import { authClient } from "@bootcamp/auth/client";
import { useRouter } from "next/navigation";

export function SignOut() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="button button-quiet"
      onClick={async () => {
        await authClient.signOut();
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
