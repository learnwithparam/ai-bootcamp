const HERE = "http://this.site";

// Only a path on this site, so a crafted link cannot send someone elsewhere after they sign in.
// The URL parser decides, the same way the browser will. The result is parsed a second time,
// because "/.//evil.com" tidies up to "//evil.com", which the browser would read as another site.
export function samePath(next: string | undefined): string {
  if (!next?.startsWith("/")) return "/";
  const url = new URL(next, HERE);
  const path = url.pathname + url.search + url.hash;
  return url.origin === HERE && new URL(path, HERE).origin === HERE ? path : "/";
}
