import { isIP } from "node:net";

// The server opens pages the model names, and a page on the web can name any address.
// Only public http and https addresses are opened, never this machine or the private network it sits on.
// isPublicUrl checks the address as written. isPublicIp checks each address its name resolves to,
// so a public-looking name that points at 127.0.0.1 is refused too.

const PRIVATE_V4 = [
  /^0\./,
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
  /^(22[4-9]|2[3-5]\d)\./,
];

export function isPublicIp(address: string): boolean {
  const ip = address.toLowerCase().replace(/^\[|\]$/g, "");
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped?.[1]) return isPublicIp(mapped[1]);
  if (isIP(ip) === 4) return !PRIVATE_V4.some((range) => range.test(ip));
  if (isIP(ip) !== 6) return false;
  if (ip === "::" || ip === "::1" || ip.startsWith("::ffff:")) return false;
  return !/^(fc|fd|fe[89ab]|ff)/.test(ip);
}

export function isPublicUrl(url: string): boolean {
  if (!URL.canParse(url)) return false;
  const parsed = new URL(url);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) return false;
  if (isIP(host)) return isPublicIp(host);
  return host.includes(".");
}
