import { Topbar } from "@bootcamp/auth/topbar";
import type { ReactNode } from "react";
import { type ChatLink, Sidebar } from "./Sidebar";

// The same frame on every page: the bar, the chat list, and the page itself.
export function Shell({
  userName,
  chats,
  current,
  children,
}: {
  userName: string;
  chats: ChatLink[];
  current?: string;
  children: ReactNode;
}) {
  return (
    <div className="app">
      <Topbar title="Team workspace" userName={userName} />
      <div className="workspace">
        <Sidebar chats={chats} current={current} />
        <main className="workspace-main">{children}</main>
      </div>
    </div>
  );
}
