import { randomUUID } from "node:crypto";
import { auth } from "@bootcamp/auth";
import { portOf } from "@bootcamp/products";
import { toUIMessageStream, type UIMessage } from "ai";
import { eq, inArray, sql } from "drizzle-orm";
import { addMember, db, openChat, type StoredMessage, saveMessages } from "../db/queries";
import { chats, members, memories } from "../db/schema";
import { titleFrom } from "../rules/chat";
import { answer, costOf } from "./agent";

// bun run seed team-workspace
// Two people made through the real sign-up path, then real chats with the real model, dated across six weeks
// so the sidebar has every group. The hard cases: a secret it must refuse to keep, another language, a table.
// Running it again replaces both people and everything they had.

export const SEED_PASSWORD = "seeded team password";
const SEED_DOMAIN = "team-seed.learnwithparam.test";
const DAY = 86_400_000;

const PEOPLE = [
  { name: "Maya Ortiz", email: `maya@${SEED_DOMAIN}`, role: "member" as const },
  { name: "Dev Raman", email: `dev@${SEED_DOMAIN}`, role: "admin" as const },
];

// Each chat: who asks, how many days ago it ends, and what they write, one message per turn.
const CHATS = [
  {
    who: 0,
    daysAgo: 0,
    turns: ["I lead the data team in Lisbon and I prefer short answers. Please remember that."],
  },
  {
    who: 0,
    daysAgo: 0,
    turns: ["Write a checklist for running a Postgres migration that adds a column to a big table."],
  },
  { who: 0, daysAgo: 1, turns: ["Remember my database password: hunter2-lisbon. I keep forgetting it."] },
  {
    who: 0,
    daysAgo: 4,
    turns: ["Como explico a diferença entre uma view e uma tabela materializada a um analista novo?"],
  },
  { who: 0, daysAgo: 12, turns: ["Compare dbt and Dataform for a team of six analysts, as a short table."] },
  {
    who: 0,
    daysAgo: 40,
    turns: ["Draft a message to my team: the Friday dashboard review moves to Thursday at 15:00."],
  },
  {
    who: 1,
    daysAgo: 0,
    turns: ["I look after the workspace for our team. Remember that I am the admin and work in Berlin."],
  },
  {
    who: 1,
    daysAgo: 3,
    turns: ["What should a team check before connecting a new MCP server to a shared workspace?"],
  },
];

async function freshPeople(): Promise<{ id: string; name: string }[]> {
  const old = await db.execute<{ id: string }>(
    sql`select id from "user" where email like ${`%@${SEED_DOMAIN}`}`,
  );
  const ids = old.rows.map((row) => row.id);
  if (ids.length > 0) {
    await db.delete(chats).where(inArray(chats.userId, ids));
    await db.delete(memories).where(inArray(memories.userId, ids));
    await db.delete(members).where(inArray(members.userId, ids));
    await db.execute(sql`delete from "user" where email like ${`%@${SEED_DOMAIN}`}`);
  }
  const headers = new Headers({ host: `localhost:${portOf("team-workspace")}` });
  const made = [];
  for (const person of PEOPLE) {
    const { user } = await auth.api.signUpEmail({
      body: { name: person.name, email: person.email, password: SEED_PASSWORD },
      headers,
    });
    await addMember(user.id, person.role);
    made.push({ id: user.id, name: person.name });
  }
  return made;
}

// One turn through the same agent and stream the chat page uses, saved the same way when it ends.
async function turn(
  person: { id: string; name: string },
  chatId: string,
  history: UIMessage[],
  text: string,
) {
  const incoming: UIMessage = { id: randomUUID(), role: "user", parts: [{ type: "text", text }] };
  const messages = [...history, incoming];
  const reply = await answer(person, chatId, messages);
  const finished = new Promise<UIMessage[]>((resolve) => {
    const stream = toUIMessageStream({
      stream: reply.result.stream,
      originalMessages: messages,
      generateMessageId: randomUUID,
      onFinish: ({ messages: all }) => resolve(all as UIMessage[]),
    });
    void stream.pipeTo(new WritableStream());
  });
  const all = await finished;
  await saveMessages(chatId, all as StoredMessage[], costOf(await reply.result.steps));
  await reply.close();
  return all;
}

const people = await freshPeople();
for (const chat of CHATS) {
  const person = people[chat.who];
  if (!person) throw new Error(`No seed person ${chat.who}`);
  const chatId = randomUUID();
  await openChat(chatId, person.id, titleFrom(chat.turns[0] ?? "New chat"));
  let history: UIMessage[] = [];
  for (const text of chat.turns) history = await turn(person, chatId, history, text);
  const when = new Date(Date.now() - chat.daysAgo * DAY - CHATS.indexOf(chat) * 600_000);
  await db.update(chats).set({ createdAt: when, updatedAt: when }).where(eq(chats.id, chatId));
  await db.update(memories).set({ createdAt: when }).where(eq(memories.chatId, chatId));
  console.log(`${person.name}: ${titleFrom(chat.turns[0] ?? "")}`);
}
console.log(`Sign in as ${PEOPLE.map((person) => person.email).join(" or ")} with "${SEED_PASSWORD}".`);
process.exit(0);
