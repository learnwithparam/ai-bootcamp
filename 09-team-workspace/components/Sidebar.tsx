"use client";

import { Menu, Search, SquarePen, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { UserMenu } from "./UserMenu";

export type ChatLink = { id: string; title: string };
export type ChatGroupView = { label: string; chats: ChatLink[] };
export type Person = { name: string; role: "member" | "admin" };

function ChatGroups({
  groups,
  current,
  query,
}: {
  groups: ChatGroupView[];
  current?: string;
  query: string;
}) {
  const wanted = query.trim().toLowerCase();
  const shown = groups
    .map((group) => ({
      ...group,
      chats: group.chats.filter((chat) => chat.title.toLowerCase().includes(wanted)),
    }))
    .filter((group) => group.chats.length > 0);
  if (groups.length === 0) return <p className="sidebar-empty">Your chats appear here.</p>;
  if (shown.length === 0) return <p className="sidebar-empty">No chat title has "{query.trim()}".</p>;
  return (
    <div className="chat-groups">
      {shown.map((group) => (
        <section key={group.label} aria-label={group.label}>
          <h2 className="chat-group-label">{group.label}</h2>
          <ul className="chat-list">
            {group.chats.map((chat) => (
              <li key={chat.id}>
                <Link href={`/chat/${chat.id}`} aria-current={chat.id === current ? "page" : undefined}>
                  {chat.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

// The person's own chats by day, a search over their titles, and their menu. On a phone it opens from the top bar.
export function Sidebar(props: { groups: ChatGroupView[]; current?: string; person: Person }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="mobile-bar">
        <button type="button" className="icon-button" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          <span className="sr-only">Chats and settings</span>
        </button>
        <span className="brand">Team workspace</span>
      </div>
      <nav className="sidebar" data-open={open} aria-label="Chats">
        <div className="sidebar-top">
          <Link href="/" className="brand">
            Team workspace
          </Link>
          <Link href="/" className="icon-button" title="New chat">
            <SquarePen aria-hidden="true" />
            <span className="sr-only">New chat</span>
          </Link>
        </div>
        <label className="sidebar-search">
          <Search aria-hidden="true" />
          <span className="sr-only">Search chats</span>
          <input
            type="search"
            className="field"
            placeholder="Search chats"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <ChatGroups groups={props.groups} current={props.current} query={query} />
        <UserMenu person={props.person} />
      </nav>
    </>
  );
}
