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

// IPv6 is allowed only in the global unicast range, 2000::/3. Inside it, 6to4 (2002::/16), Teredo (2001:0::/32)
// and the documentation range carry or stand for other addresses, so they are refused too.
function isPublicIpv6(ip: string): boolean {
  const canonical = new URL(`http://[${ip}]/`).hostname.slice(1, -1);
  if (!/^[23][0-9a-f]{0,3}:/.test(canonical) || canonical.split(":")[0]?.length !== 4) return false;
  return !/^(2002:|2001::|2001:0:|2001:db8:)/.test(canonical);
}

export function isPublicIp(address: string): boolean {
  const ip = address.toLowerCase().replace(/^\[|\]$/g, "");
  if (isIP(ip) === 4) return !PRIVATE_V4.some((range) => range.test(ip));
  return isIP(ip) === 6 && isPublicIpv6(ip);
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
