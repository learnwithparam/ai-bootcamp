// The limits on a conversation, and its title. Plain code, read before the model sees anything.

export const CHAT = { maxMessages: 200, maxMessageCharacters: 20_000, titleLength: 60 } as const;

// The first words of the first message, cut at a word, so the sidebar reads well.
export function titleFrom(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= CHAT.titleLength) return clean || "New chat";
  const cut = clean.slice(0, CHAT.titleLength);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 20 ? cut.slice(0, lastSpace) : cut).trim()}...`;
}

// null when the new message may go to the model, otherwise what the person reads.
export function whyNotSend(messageCount: number, newText: string): string | null {
  if (messageCount >= CHAT.maxMessages)
    return "This chat is full. Start a new chat; your memories come with you.";
  if (newText.length > CHAT.maxMessageCharacters)
    return `Keep a message under ${CHAT.maxMessageCharacters.toLocaleString("en")} characters.`;
  return null;
}

// A message as the browser sends it and as the database keeps it.
type Part = { type: string; toolCallId?: string; state?: string; approval?: { approved?: boolean } };
export type Message = { id: string; role: "system" | "user" | "assistant"; parts: Part[] };

// The browser sends only its newest message. The history always comes from the database, so a browser
// cannot rewrite what was said or what a tool returned. A new user message is added at the end.
// An assistant message is accepted only as the answer to an approval card on the last stored message:
// its approval answers are copied onto that message, and nothing else from it is kept.
export function withIncoming(history: Message[], incoming: Message): Message[] | string {
  if (incoming.role === "user") {
    if (history.some((message) => message.id === incoming.id)) return "That message was sent already.";
    return [
      ...history,
      { id: incoming.id, role: "user", parts: incoming.parts.filter((p) => p.type === "text") },
    ];
  }
  const last = history.at(-1);
  if (incoming.role !== "assistant" || last?.id !== incoming.id)
    return "Only the last reply can be answered.";
  const answers = new Map(
    incoming.parts.filter((part) => part.toolCallId && part.approval).map((part) => [part.toolCallId, part]),
  );
  const parts = last.parts.map((part) => {
    const answer = part.state === "approval-requested" ? answers.get(part.toolCallId) : undefined;
    return answer ? { ...part, state: answer.state, approval: answer.approval } : part;
  });
  return [...history.slice(0, -1), { ...last, parts }];
}
