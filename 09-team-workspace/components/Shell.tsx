import type { ReactNode } from "react";
import { groupChats } from "../rules/chat";
import { type Person, Sidebar } from "./Sidebar";

type ChatRow = { id: string; title: string; updatedAt: Date };

// The same frame on every page: the chat list grouped by day, the person's menu, and the page itself.
export function Shell(props: { person: Person; chats: ChatRow[]; current?: string; children: ReactNode }) {
  const groups = groupChats(props.chats, new Date()).map((group) => ({
    label: group.label,
    chats: group.chats.map(({ id, title }) => ({ id, title })),
  }));
  return (
    <div className="workspace">
      <Sidebar groups={groups} current={props.current} person={props.person} />
      <main className="workspace-main">{props.children}</main>
    </div>
  );
}
