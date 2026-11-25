import Link from "next/link";

export type ChatLink = { id: string; title: string };

// The person's own chats, newest first, and the two pages that hold what the assistant may use.
export function Sidebar({ chats, current }: { chats: ChatLink[]; current?: string }) {
  return (
    <nav className="sidebar" aria-label="Chats">
      <Link href="/" className="button button-primary new-chat">
        New chat
      </Link>
      <ul className="chat-list">
        {chats.map((chat) => (
          <li key={chat.id}>
            <Link href={`/chat/${chat.id}`} aria-current={chat.id === current ? "page" : undefined}>
              {chat.title}
            </Link>
          </li>
        ))}
      </ul>
      {chats.length === 0 ? <p className="sidebar-empty">Your chats appear here.</p> : null}
      <div className="sidebar-foot">
        <Link href="/memory">What it remembers</Link>
        <Link href="/connectors">Connectors</Link>
      </div>
    </nav>
  );
}
