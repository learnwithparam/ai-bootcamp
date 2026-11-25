import { InvalidToolApprovalSignatureError } from "ai";

// What the owner reads when a reply fails. The details stay in the server log, never on the page.
export function errorMessage(error: unknown): string {
  if (InvalidToolApprovalSignatureError.isInstance(error)) {
    return "That approval was not issued by this server, or the code was changed after it. Nothing was made.";
  }
  return "The assistant could not answer just now. Try again in a minute.";
}
