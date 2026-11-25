import { InvalidToolApprovalSignatureError } from "ai";

// What the person reads when a reply fails. The details stay in the server log, never on the page.
export function errorMessage(error: unknown): string {
  if (InvalidToolApprovalSignatureError.isInstance(error)) {
    return "That approval was not issued by this server, or the request was changed after it. Nothing ran.";
  }
  return "The assistant could not answer just now. Try again in a minute.";
}
