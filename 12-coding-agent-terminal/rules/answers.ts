import type { Permission } from "@bootcamp/coding-harness/rules/permission";

// The three answers to a permission prompt, and what "Always" remembers.
// Always lasts until you quit, never longer: a new session starts by asking again.

export type Answer = "once" | "always" | "deny";

export const ANSWERS: { answer: Answer; key: string; label: (permission: Permission) => string }[] = [
  { answer: "once", key: "1", label: () => "Yes, this once" },
  {
    answer: "always",
    key: "2",
    label: (permission) =>
      permission.key === "edits"
        ? "Yes, and allow edits until I quit"
        : `Yes, and allow ${permission.key} until I quit`,
  },
  { answer: "deny", key: "3", label: () => "No, try another way" },
];

export function answerForKey(key: string): Answer | null {
  if (key === "y") return "once";
  if (key === "n") return "deny";
  return ANSWERS.find((each) => each.key === key)?.answer ?? null;
}

export function settleAnswer(answer: Answer, permission: Permission, allowed: Set<string>): boolean {
  if (answer === "always") allowed.add(permission.key);
  return answer !== "deny";
}
