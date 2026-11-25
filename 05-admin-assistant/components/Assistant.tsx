"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { AssistantChatTransport, useChatRuntime } from "@assistant-ui/react-ai-sdk";
import type { UIMessage } from "ai";
import { Sparkles, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SAVES_SOMETHING } from "../agent/tools/names";
import { ASK_EVENT } from "./AskButton";
import { Thread } from "./Thread";

// True when a reply saved a draft, so the page under the panel is drawn again and the new row shows on it.
function savedSomething(message: UIMessage): boolean {
  return message.parts.some((part) => SAVES_SOMETHING.some((name) => part.type === `tool-${name}`));
}

function Panel({ onClose }: { onClose: () => void }) {
  return (
    <aside className="assistant-panel" aria-label="Assistant">
      <div className="assistant-head">
        <Sparkles aria-hidden="true" /> <strong>Assistant</strong>
        <button
          type="button"
          className="button button-quiet"
          onClick={onClose}
          aria-label="Close the assistant"
        >
          <X aria-hidden="true" />
        </button>
      </div>
      <Thread />
    </aside>
  );
}

// The assistant lives in the layout, so its conversation stays while the person moves between pages.
// Closed, it is a small prompt button at the bottom. Open, it is a panel at the side; on a phone it fills the screen.
export function Assistant() {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const router = useRouter();
  const page = useRef(path);
  page.current = path;
  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({ api: "/api/chat", body: () => ({ page: page.current }) }),
    onFinish: ({ message }) => {
      if (savedSomething(message)) router.refresh();
    },
  });
  useEffect(() => {
    const ask = (event: Event) => {
      setOpen(true);
      runtime.thread.append(String((event as CustomEvent<string>).detail));
    };
    window.addEventListener(ASK_EVENT, ask);
    return () => window.removeEventListener(ASK_EVENT, ask);
  }, [runtime]);
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {open ? (
        <Panel onClose={() => setOpen(false)} />
      ) : (
        <button type="button" className="assistant-pill" onClick={() => setOpen(true)}>
          <Sparkles aria-hidden="true" /> Ask the assistant
        </button>
      )}
    </AssistantRuntimeProvider>
  );
}
