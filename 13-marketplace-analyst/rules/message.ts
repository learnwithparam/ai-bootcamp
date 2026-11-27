// A chat message as it is saved. It has the shape of the chat library's message, without importing it.

export type StoredMessage = {
  id: string;
  role: "system" | "user" | "assistant";
  parts: { type: string; [key: string]: unknown }[];
};

export function textOf(message: StoredMessage): string {
  return message.parts.map((part) => (part.type === "text" ? String(part.text) : "")).join("");
}

// An answer on screen holds values from the rows. Its template does not, so a model gets that instead.
function forModel(message: StoredMessage): string {
  if (message.role === "user") return textOf(message);
  const part = message.parts.find((each) => each.type === "data-template");
  return (part?.data as { template?: string } | undefined)?.template ?? "";
}

// The last few turns, so a follow-up such as "and in 2018?" can be understood.
export function recentTurns(messages: StoredMessage[], count = 6): string {
  const turns = messages.slice(-count).map((m) => `${m.role}: ${forModel(m).slice(0, 600)}`);
  return turns.length ? turns.join("\n") : "(none)";
}
