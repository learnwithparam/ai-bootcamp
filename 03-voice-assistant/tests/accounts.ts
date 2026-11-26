import { tmpdir } from "node:os";
import { join } from "node:path";
import { auth } from "@bootcamp/auth";
import { portOf } from "@bootcamp/products";
import { inArray, sql } from "drizzle-orm";
import { db } from "../db/queries";
import { bookings, calls, lines, messages } from "../db/schema";

// Real accounts for the tests, made the way the sign-up page makes them, and removed afterwards
// with the calls a test browser placed.
export const PASSWORD = "a long test password";

export async function makeAccount(name: string): Promise<{ id: string; email: string }> {
  const email = `clinic-test-${crypto.randomUUID()}@example.com`;
  const headers = new Headers({ host: `localhost:${portOf("voice-assistant")}` });
  const made = await auth.api.signUpEmail({ body: { name, email, password: PASSWORD }, headers });
  return { id: made.user.id, email };
}

export async function removeAccounts(ids: string[]) {
  for (const id of ids) {
    await db.execute(sql`delete from voice_assistant.team where user_id = ${id}`);
    await db.execute(sql`delete from "user" where id = ${id}`);
  }
}

// Removes these callers' calls with everything the calls left: lines, bookings and messages.
export async function removeCallers(callers: string[]) {
  if (!callers.length) return;
  const ids = db.select({ id: calls.id }).from(calls).where(inArray(calls.caller, callers));
  await db.delete(lines).where(inArray(lines.callId, ids));
  await db.delete(bookings).where(inArray(bookings.callId, ids));
  await db.delete(messages).where(inArray(messages.callId, ids));
  await db.delete(calls).where(inArray(calls.caller, callers));
}

// A recorded line with silence before it, for Chromium's fake microphone, which starts playing the
// moment the call opens. The silence lets the agent finish its greeting before the caller speaks.
export async function lineAfterSilence(line: string, seconds: number): Promise<string> {
  const wav = new Uint8Array(await Bun.file(new URL(`./voices/${line}.wav`, import.meta.url)).arrayBuffer());
  const view = new DataView(wav.buffer);
  const chunks = new Map<string, { at: number; size: number }>();
  for (let at = 12; at + 8 <= wav.length; ) {
    const size = view.getUint32(at + 4, true);
    chunks.set(String.fromCharCode(...wav.subarray(at, at + 4)), { at: at + 8, size });
    at += 8 + size + (size % 2);
  }
  const format = chunks.get("fmt ");
  const data = chunks.get("data");
  if (!format || !data) throw new Error(`The recording ${line} is not a WAV file.`);
  const rate = view.getUint32(format.at + 4, true);
  const speech = wav.subarray(data.at, data.at + data.size);
  const quiet = new Uint8Array(rate * 2 * seconds);
  const header = new DataView(new ArrayBuffer(44));
  const text = (offset: number, word: string) => {
    for (const [i, c] of [...word].entries()) header.setUint8(offset + i, c.charCodeAt(0));
  };
  text(0, "RIFF");
  header.setUint32(4, 36 + quiet.length + speech.length, true);
  text(8, "WAVEfmt ");
  for (const [offset, value, size] of [
    [16, 16, 4],
    [20, 1, 2],
    [22, 1, 2],
    [24, rate, 4],
    [28, rate * 2, 4],
    [32, 2, 2],
    [34, 16, 2],
  ]) {
    if (size === 4) header.setUint32(offset as number, value as number, true);
    else header.setUint16(offset as number, value as number, true);
  }
  text(36, "data");
  header.setUint32(40, quiet.length + speech.length, true);
  const path = join(tmpdir(), `harbour-${line}-${crypto.randomUUID()}.wav`);
  await Bun.write(path, new Blob([header.buffer, quiet, speech]));
  return path;
}
