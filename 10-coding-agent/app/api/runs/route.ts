import { currentSession } from "@bootcamp/auth";
import { roleOf } from "../../../db/people";
import { saveRun } from "../../../db/queries";
import { readSession, type SessionEvent, summarize } from "../../../rules/session";

// Where `bun run code upload` sends a session file. Only a developer on the team may send one,
// and the file is checked line by line before anything is saved.

const MAX_BYTES = 2_000_000;

const answer = (status: number, body: object) => Response.json(body, { status });

export async function POST(request: Request) {
  const session = await currentSession(request.headers);
  if (!session) return answer(401, { error: "Sign in first with: bun run code login" });
  if ((await roleOf(session.user.id)) !== "developer") {
    return answer(403, { error: "Only a developer on the team can send runs." });
  }
  const text = await readCapped(request);
  if (text === null) return answer(413, { error: "The session file is over 2 MB." });
  const events = readUpload(text);
  if ("error" in events) return answer(400, events);
  return answer(201, { id: await saveRun(session.user.id, events) });
}

// A file that is not JSON lines, or has a line that is not an event, is refused with the reason.
// Counts bytes as they arrive and stops at the cap, so a large body is never held in memory.
// The Content-Length header is only a hint: a client can leave it out or understate it.
async function readCapped(request: Request): Promise<string | null> {
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BYTES) return null;
  const parts: Uint8Array[] = [];
  let total = 0;
  const reader = request.body?.getReader();
  if (!reader) return "";
  for (let next = await reader.read(); !next.done; next = await reader.read()) {
    total += next.value.byteLength;
    if (total > MAX_BYTES) {
      await reader.cancel();
      return null;
    }
    parts.push(next.value);
  }
  return Buffer.concat(parts).toString("utf8");
}

function readUpload(text: string): SessionEvent[] | { error: string } {
  try {
    const events = readSession(text);
    summarize(events);
    return events;
  } catch (error) {
    console.error(`Upload refused: ${(error as Error).message}`);
    return {
      error:
        error instanceof SyntaxError ? "The session file is not valid JSON lines." : (error as Error).message,
    };
  }
}
