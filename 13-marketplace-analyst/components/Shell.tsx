"use client";

import { authClient } from "@bootcamp/auth/client";
import { Gauge, LogOut, MessageSquare, SquarePen } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

type Props = {
  userName: string;
  history: { id: string; title: string }[];
  // The open chat's id, "new" for a fresh one, or "evals".
  current: string;
  children: ReactNode;
};

function SignOut() {
  const router = useRouter();
  const signOut = async () => {
    await authClient.signOut();
    router.push("/sign-in");
  };
  return (
    <button type="button" className="icon-button" aria-label="Sign out" onClick={signOut}>
      <LogOut aria-hidden="true" />
    </button>
  );
}

function Entry(props: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link href={props.href} className="shell-link" aria-current={props.active ? "page" : undefined}>
      {props.children}
    </Link>
  );
}

export function Shell({ userName, history, current, children }: Props) {
  return (
    <div className="shell">
      <nav className="shell-nav" aria-label="Chats">
        <Link href="/" className="shell-brand">
          Marketplace analyst
        </Link>
        <Entry href="/" active={current === "new"}>
          <SquarePen aria-hidden="true" /> New question
        </Entry>
        <Entry href="/evals" active={current === "evals"}>
          <Gauge aria-hidden="true" /> Evals
        </Entry>
        {history.length ? <span className="shell-section">Earlier</span> : null}
        {history.map((chat) => (
          <Entry key={chat.id} href={`/?c=${chat.id}`} active={current === chat.id}>
            <MessageSquare aria-hidden="true" /> <span className="chat-title">{chat.title}</span>
          </Entry>
        ))}
        <div className="shell-user">
          <span className="shell-user-name">{userName}</span>
          <SignOut />
        </div>
      </nav>
      <main className="shell-main">{children}</main>
    </div>
  );
}
