// Only a path on this site, so a crafted link cannot send someone elsewhere after they sign in.
// The URL parser decides, the same way the browser will, so "//evil.com" and "/\evil.com" both land on "/".
export function samePath(next: string | undefined): string {
  if (!next?.startsWith("/")) return "/";
  const url = new URL(next, "http://this.site");
  return url.origin === "http://this.site" ? url.pathname + url.search + url.hash : "/";
}
