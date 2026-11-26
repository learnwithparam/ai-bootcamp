"use client";

import { Sparkles } from "lucide-react";

export const ASK_EVENT = "admin-assistant:ask";

// A button anywhere in the admin that opens the assistant panel and sends it one request.
export function AskButton({
  prompt,
  label,
  className = "button",
}: {
  prompt: string;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => window.dispatchEvent(new CustomEvent(ASK_EVENT, { detail: prompt }))}
    >
      <Sparkles aria-hidden="true" /> {label}
    </button>
  );
}
