"use client";

import { MessageCircle, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import type { Opened } from "./Conversation";

// The chat code loads only after the first click, so the page itself stays as fast as it was.
const Conversation = dynamic(() => import("./Conversation").then((loaded) => loaded.Conversation), {
  ssr: false,
  loading: () => <p className="messenger-loading">Opening the conversation...</p>,
});

const fresh = (): Opened => ({
  id: crypto.randomUUID(),
  messages: [],
  owner: "assistant",
  ownerName: "The assistant",
  assigned: false,
});

// Picks up the visitor's open conversation from the last week, or starts a new one.
async function openConversation(): Promise<Opened> {
  const response = await fetch("/api/conversation", { signal: AbortSignal.timeout(10_000) }).catch(
    () => null,
  );
  if (!response?.ok) return fresh();
  const { conversation, messages } = await response.json();
  return conversation ? { ...conversation, messages } : fresh();
}

// The launcher in the corner of every page, like Intercom's. It opens a panel that keeps its conversation.
export function Messenger() {
  const [open, setOpen] = useState(false);
  const [opened, setOpened] = useState<Opened | null>(null);
  async function toggle() {
    setOpen((was) => !was);
    if (!opened) setOpened(await openConversation());
  }
  return (
    <>
      {open ? (
        <section className="messenger" aria-label="Messenger">
          {opened ? (
            <Conversation
              key={opened.id}
              start={opened}
              onNew={() => setOpened(fresh())}
              onClose={() => setOpen(false)}
            />
          ) : (
            <p className="messenger-loading">Opening the conversation...</p>
          )}
        </section>
      ) : null}
      <button
        type="button"
        className="launcher"
        aria-label={open ? "Close the messenger" : "Ask a question"}
        aria-expanded={open}
        onClick={toggle}
      >
        {open ? <X aria-hidden="true" /> : <MessageCircle aria-hidden="true" />}
      </button>
    </>
  );
}
