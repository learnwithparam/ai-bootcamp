// A messenger conversation and the support inbox's views of it. Plain code, no model.

export const CONVERSATION = { maxMessages: 60, maxCharacters: 2_000, replyCharacters: 4_000 } as const;

type Part = { type: string; text?: string };
// Who wrote an assistant message: the assistant, or a named person on the support team.
export type Author = { author: "assistant" } | { author: "teammate"; name: string };
export type StoredMessage = { id: string; role: "user" | "assistant"; parts: Part[]; metadata?: Author };

export const textOf = (message: { parts: Part[] }) =>
  message.parts.map((part) => (part.type === "text" ? (part.text ?? "") : "")).join("");

// The browser sends only its newest message. The history always comes from the database, so a browser
// cannot rewrite what the assistant or a teammate said. Only the visitor's own text is kept.
export function withIncoming(history: StoredMessage[], incoming: StoredMessage): StoredMessage[] | string {
  if (incoming.role !== "user") return "Only a visitor's message can be sent here.";
  if (history.some((message) => message.id === incoming.id)) return "That message was sent already.";
  if (history.length >= CONVERSATION.maxMessages)
    return "This conversation is full. Start a new one from the messenger.";
  const parts = incoming.parts.filter((part) => part.type === "text" && part.text?.trim());
  const text = textOf({ parts });
  if (!text) return "Write a message first.";
  if (text.length > CONVERSATION.maxCharacters)
    return `Keep a message under ${CONVERSATION.maxCharacters.toLocaleString("en")} characters.`;
  return [...history, { id: incoming.id, role: "user", parts: [{ type: "text", text }] }];
}

// A reply from a person on the team, in the shape the messenger already shows.
export function teammateReply(id: string, name: string, text: string): StoredMessage | string {
  const clean = text.trim();
  if (!clean) return "Write a reply first.";
  if (clean.length > CONVERSATION.replyCharacters)
    return `Keep a reply under ${CONVERSATION.replyCharacters.toLocaleString("en")} characters.`;
  return {
    id,
    role: "assistant",
    parts: [{ type: "text", text: clean }],
    metadata: { author: "teammate", name },
  };
}

type Owned = { owner: "assistant" | "team"; assigneeId: string | null; assigneeName: string | null };

// One conversation as the screens read it. db/schema.ts stores exactly these columns.
export type ConversationRecord = Owned & {
  id: string;
  visitor: string;
  userId: string | null;
  name: string | null;
  email: string | null;
  startedOn: string;
  summary: string | null;
  handedOffAt: Date | null;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

// A line in the inbox list, with the conversation's newest message.
export type InboxRow = Pick<
  ConversationRecord,
  "id" | "name" | "email" | "owner" | "assigneeId" | "assigneeName" | "closedAt" | "updatedAt" | "summary"
> & { last: StoredMessage };

// The line under a name in the inbox list. A teammate's reply shows who wrote it. While a hand-off waits,
// the assistant's summary says what the visitor needs better than its last words to them.
export function previewOf(row: Pick<InboxRow, "last" | "owner" | "summary">): string {
  const { last } = row;
  if (last.metadata?.author === "teammate") return `${last.metadata.name}: ${textOf(last)}`;
  if (row.owner === "team" && row.summary && last.role === "assistant") return row.summary;
  return textOf(last);
}

// The name the messenger shows at the top, so the visitor always knows who is answering.
export function ownerName(conversation: Owned): string {
  if (conversation.owner === "assistant") return "The assistant";
  return conversation.assigneeName ?? "The support team";
}

// The status line under the visitor's name in the inbox.
export function statusOf(conversation: Owned & { closedAt: Date | null }): string {
  if (conversation.closedAt) return "Closed";
  if (conversation.owner === "assistant") return "Answered by the assistant";
  return conversation.assigneeName ? `Assigned to ${conversation.assigneeName}` : "Waiting for a person";
}

// The inbox views, like Intercom's: what waits for a person first, then what is mine.
export const VIEWS = {
  waiting: "Waiting for a person",
  mine: "Assigned to me",
  team: "All with the team",
  assistant: "Answered by the assistant",
  closed: "Closed",
} as const;
export type View = keyof typeof VIEWS;

type Listed = Owned & { closedAt: Date | null };

// Which views a conversation shows in, for the person looking. A conversation can be in more than one.
export function viewsOf(conversation: Listed, me: string): View[] {
  if (conversation.closedAt) return ["closed"];
  if (conversation.owner === "assistant") return ["assistant"];
  const views: View[] = ["team"];
  if (!conversation.assigneeId) views.unshift("waiting");
  if (conversation.assigneeId === me) views.unshift("mine");
  return views;
}

export const isView = (value: string | undefined): value is View => Boolean(value && value in VIEWS);
