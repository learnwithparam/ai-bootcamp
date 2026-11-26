import { type LookupAddress, lookup } from "node:dns";
import http from "node:http";
import https from "node:https";
import type { Readable } from "node:stream";
import { isPublicIp } from "../rules/public-url";

// Opens one address and returns its status, headers and body, without following redirects.
// The check runs inside the lookup the connection itself uses. So the address that is checked is the address
// that is opened, and a name cannot answer with a public address for the check and a private one for the fetch.

export type Opened = { status: number; headers: http.IncomingHttpHeaders; body: Readable };

type LookupCallback = (error: Error | null, address: string | LookupAddress[], family?: number) => void;

function publicOnly(trustedHost: string | undefined) {
  return (host: string, options: { all?: boolean }, done: LookupCallback) => {
    lookup(host, { all: true }, (error, addresses) => {
      if (error) return done(error, []);
      const allowed = host === trustedHost || addresses.every((found) => isPublicIp(found.address));
      if (!allowed || addresses.length === 0)
        return done(new Error(`${host} is not a public web address.`), []);
      if (options.all) return done(null, addresses);
      const [first] = addresses as [LookupAddress];
      done(null, first.address, first.family);
    });
  };
}

export function openUrl(url: string, trustedHost: string | undefined, timeoutMs: number): Promise<Opened> {
  const client = url.startsWith("https:") ? https : http;
  return new Promise((resolve, reject) => {
    const request = client.get(url, {
      headers: { "user-agent": "learnwithparam-research-agent/1.0", accept: "text/html,text/plain" },
      lookup: publicOnly(trustedHost) as never,
      signal: AbortSignal.timeout(timeoutMs),
    });
    request.on("response", (response) =>
      resolve({ status: response.statusCode ?? 0, headers: response.headers, body: response }),
    );
    request.on("error", reject);
  });
}
