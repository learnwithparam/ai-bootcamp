// The server opens pages the model names, and a page on the web can name any address.
// Only public http and https addresses are opened, never this machine or the private network it sits on.

const PRIVATE_V4 = [/^127\./, /^10\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[01])\./, /^169\.254\./, /^0\./];

export function isPublicUrl(url: string): boolean {
  if (!URL.canParse(url)) return false;
  const parsed = new URL(url);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) return false;
  if (host.includes(":"))
    return !(host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80"));
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return !PRIVATE_V4.some((range) => range.test(host));
  return host.includes(".");
}
