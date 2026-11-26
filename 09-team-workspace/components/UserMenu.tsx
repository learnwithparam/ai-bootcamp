"use client";

import { authClient } from "@bootcamp/auth/client";
import { Brain, ChevronsUpDown, LogOut, Plug } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import type { Person } from "./Sidebar";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => [...word][0]?.toUpperCase())
    .join("");

// Who is signed in, at the foot of the sidebar. It opens upward to Settings and Sign out, like ChatGPT's.
export function UserMenu({ person }: { person: Person }) {
  const router = useRouter();
  const menu = useRef<HTMLDetailsElement>(null);
  const close = () => menu.current?.removeAttribute("open");
  async function signOut() {
    await authClient.signOut();
    router.push("/sign-in");
  }
  return (
    <details className="user-menu" ref={menu}>
      <summary>
        <span className="avatar" aria-hidden="true">
          {initials(person.name)}
        </span>
        <span className="user-name">
          {person.name}
          <small>{person.role === "admin" ? "Admin" : "Member"}</small>
        </span>
        <ChevronsUpDown aria-hidden="true" />
      </summary>
      <div className="user-menu-items">
        <Link href="/memory" onClick={close}>
          <Brain aria-hidden="true" /> Memory
        </Link>
        <Link href="/connectors" onClick={close}>
          <Plug aria-hidden="true" /> Connectors
        </Link>
        <button type="button" onClick={signOut}>
          <LogOut aria-hidden="true" /> Sign out
        </button>
      </div>
    </details>
  );
}
