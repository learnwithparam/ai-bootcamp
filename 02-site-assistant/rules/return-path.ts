// Where sign-in sends someone next. Only a path on this site counts, so a link like
// /sign-in?next=https://evil.example cannot send a person somewhere else after they sign in.
export function returnPath(next: string | undefined): string {
  if (!next?.startsWith("/") || next.startsWith("//") || next.includes("\\")) return "/";
  return next;
}
