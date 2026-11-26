// What the assistant may keep about a person. Plain code, so a message cannot talk its way past it.

export const MEMORY = { minLength: 3, maxLength: 300, perPerson: 100 } as const;

export type Remembered = { id: string; text: string };

// Text that looks like a password, a key or a card number is never kept, even when someone asks.
const SECRET = [
  /\b(password|passcode|passwd|pin)\b\s*(is|:|=)/i,
  /\b(sk|pk|rk)_(live|test)_\w{8,}/,
  /\b(api[_ -]?key|secret|token)\b\s*(is|:|=)\s*\S{8,}/i,
  /\b(?:\d[ -]?){13,19}\b/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
];

export function looksSecret(text: string): boolean {
  return SECRET.some((pattern) => pattern.test(text));
}

// Every reason a memory is refused. The Memory page shows a notice only when it is one of these.
export const MEMORY_REFUSALS = {
  short: "That is too short to be worth remembering.",
  long: `Keep a memory under ${MEMORY.maxLength} characters. Save the one fact that matters.`,
  secret: "That looks like a password, key or card number. It is never remembered.",
  full: `This person already has ${MEMORY.perPerson} memories. Ask them to forget some on the Memory page first.`,
  gone: "That memory is gone.",
} as const;

// null when the memory may be saved, otherwise the reason the assistant reads back.
export function whyNotRemember(text: string, alreadyKept: number): string | null {
  const clean = text.trim();
  if (clean.length < MEMORY.minLength) return MEMORY_REFUSALS.short;
  if (clean.length > MEMORY.maxLength) return MEMORY_REFUSALS.long;
  if (looksSecret(clean)) return MEMORY_REFUSALS.secret;
  if (alreadyKept >= MEMORY.perPerson) return MEMORY_REFUSALS.full;
  return null;
}

// A notice arrives in the page address, so anyone can put words into a link.
// It is shown only when it is a sentence this app wrote.
export function knownNotice(text: string | undefined, sentences: readonly string[]): string | null {
  return text && sentences.includes(text) ? text : null;
}

// The memories as the system prompt shows them, each with its id so the assistant can forget one.
export function memoryBlock(memories: Remembered[]): string {
  if (memories.length === 0) return "Nothing yet.";
  return memories.map((memory) => `- [${memory.id}] ${memory.text}`).join("\n");
}
