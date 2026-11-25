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

// null when the memory may be saved, otherwise the reason the assistant reads back.
export function whyNotRemember(text: string, alreadyKept: number): string | null {
  const clean = text.trim();
  if (clean.length < MEMORY.minLength) return "That is too short to be worth remembering.";
  if (clean.length > MEMORY.maxLength)
    return `Keep a memory under ${MEMORY.maxLength} characters. Save the one fact that matters.`;
  if (looksSecret(clean)) return "That looks like a password, key or card number. It is never remembered.";
  if (alreadyKept >= MEMORY.perPerson)
    return `This person already has ${MEMORY.perPerson} memories. Ask them to forget some on the Memory page first.`;
  return null;
}

// The memories as the system prompt shows them, each with its id so the assistant can forget one.
export function memoryBlock(memories: Remembered[]): string {
  if (memories.length === 0) return "Nothing yet.";
  return memories.map((memory) => `- [${memory.id}] ${memory.text}`).join("\n");
}
