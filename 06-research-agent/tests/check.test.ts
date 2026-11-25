import { afterAll, expect, test } from "bun:test";
import { Readable } from "node:stream";
import { checkClaims } from "../agent/nodes/check";
import { LIMIT_BYTES, readLimited, readPage } from "../agent/read-page";

// The quote check against a real web server on this machine. No model: the claims are written here.

// A page that never ends: it sends 64 KB pieces for as long as anyone reads.
// Reading it whole would never finish, so this test returning at all shows the read stops at the limit.
function endless() {
  return new ReadableStream({
    pull(controller) {
      controller.enqueue(new Uint8Array(65_536).fill(97));
    },
  });
}

const site = Bun.serve({
  port: 0,
  fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === "/about")
      return new Response("<h1>Acme</h1><p>Acme employs 120 people in Berlin.</p>", {
        headers: { "content-type": "text/html" },
      });
    if (path === "/hop") return Response.redirect("http://127.0.0.1/secret", 302);
    if (path === "/endless") return new Response(endless(), { headers: { "content-type": "text/plain" } });
    if (path === "/file") return new Response("%PDF-1.7", { headers: { "content-type": "application/pdf" } });
    return new Response("Not found", { status: 404 });
  },
});
afterAll(() => site.stop());

const home = `http://localhost:${site.port}`;
const claim = (id: string, path: string, quote: string) => ({
  id,
  topic: "size",
  text: "t",
  sourceUrl: `${home}${path}`,
  quote,
});

test("each claim is marked found, missing or unreadable", async () => {
  const checked = await checkClaims(
    [
      claim("size-1", "/about", "Acme employs 120 people in Berlin"),
      claim("size-2", "/about", "Acme employs 900 people in Berlin"),
      claim("size-3", "/gone", "Acme employs 120 people in Berlin"),
      claim("size-4", "/file", "Acme employs 120 people in Berlin"),
    ],
    { trustedHost: "localhost" },
  );
  expect(checked.map((one) => one.check)).toEqual(["found", "missing", "unreadable", "unreadable"]);
});

test("a private address is never opened, even when a trusted page redirects to one", async () => {
  expect(await readPage(`${home}/about`)).toBeNull();
  const warnings: string[] = [];
  const warn = console.warn;
  console.warn = (message: string) => warnings.push(message);
  const hop = await readPage(`${home}/hop`, { trustedHost: "localhost" });
  console.warn = warn;
  expect(hop).toBeNull();
  expect(warnings).toContain("Refused to open http://127.0.0.1/secret: it is not a public web address.");
});

// The check runs in the lookup the connection itself uses, so the refusal comes from the connection.
test("a name that resolves to this machine is refused, even though it reads like a public site", async () => {
  const errors: string[] = [];
  const error = console.error;
  console.error = (...parts: unknown[]) => errors.push(parts.join(" "));
  const page = await readPage(`http://localhost.:${site.port}/about`);
  console.error = error;
  expect(page).toBeNull();
  expect(errors[0]).toContain("localhost. is not a public web address.");
});

test("an endless page is read only up to the limit, then the read stops", async () => {
  const response = await fetch(`${home}/endless`);
  if (!response.body) throw new Error("The endless page sent no body.");
  const text = await readLimited(Readable.fromWeb(response.body as never));
  expect(text.length).toBe(LIMIT_BYTES);
});
