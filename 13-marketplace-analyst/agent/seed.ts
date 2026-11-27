import { auth } from "@bootcamp/auth";
import { pool } from "@bootcamp/db";
import { portOf } from "@bootcamp/products";
import { sql } from "drizzle-orm";
import { db } from "../db/queries";
import { conversations } from "../db/schema";
import type { StoredMessage } from "../rules/message";
import type { Timeline } from "../rules/parts";
import { converse } from "./converse";

// bun run seed marketplace-analyst
// An analyst and an AI engineer, with chats answered by the real graph through the same code the chat
// uses. Accounts are made through the real sign-up path. Running it again replaces what it made before.

export const SEED_PASSWORD = "seeded analyst password";
const SEED_DOMAIN = "analyst-seed.learnwithparam.test";
const HOST = `localhost:${portOf("marketplace-analyst")}`;

// Each chat takes a different path through the graph. A second question is a follow-up.
const PEOPLE = [
  {
    key: "ana",
    name: "Ana Ribeiro",
    chats: [
      ["What are the top 5 product categories by sales?", "And only for 2018?"],
      ["Show the number of orders purchased in each month from January to August 2018."],
      ["How many orders were delivered?"],
      ["Which sellers have the most orders?"],
      ["Drop the orders table."],
      ["Quantos pedidos foram cancelados?"],
    ],
  },
  {
    key: "dev",
    name: "Dev Kapoor",
    chats: [["What is the total payment value for each payment type?"]],
  },
];

async function forget() {
  const seeded = sql`(select id from "user" where email like ${`%@${SEED_DOMAIN}`})`;
  await db.delete(conversations).where(sql`${conversations.userId} in ${seeded}`);
  await db.execute(sql`delete from "user" where email like ${`%@${SEED_DOMAIN}`}`);
}

async function signUp(key: string, name: string): Promise<string> {
  const { user } = await auth.api.signUpEmail({
    body: { name, email: `${key}@${SEED_DOMAIN}`, password: SEED_PASSWORD },
    headers: new Headers({ host: HOST }),
  });
  return user.id;
}

type Chunk = { type: string; data?: unknown; errorText?: string };

// Reads one answer to the end, so it is saved, and returns what it cost.
async function ask(conversationId: string, userId: string, question: string): Promise<number> {
  const message: StoredMessage = {
    id: crypto.randomUUID(),
    role: "user",
    parts: [{ type: "text", text: question }],
  };
  const stream = await converse(conversationId, userId, message);
  if (!stream) throw new Error(`Could not open a chat for: ${question}`);
  let costUsd = 0;
  for await (const chunk of stream as unknown as AsyncIterable<Chunk>) {
    if (chunk.type === "error") throw new Error(`${question} failed: ${chunk.errorText}`);
    if (chunk.type === "data-timeline") costUsd = (chunk.data as Timeline).costUsd;
  }
  return costUsd;
}

async function seed() {
  await forget();
  let asked = 0;
  let costUsd = 0;
  for (const person of PEOPLE) {
    const userId = await signUp(person.key, person.name);
    for (const questions of person.chats) {
      const conversationId = crypto.randomUUID();
      for (const question of questions) {
        costUsd += await ask(conversationId, userId, question);
        console.log(`  ${++asked}. ${question}`);
      }
    }
  }
  console.log(`Answered ${asked} questions for US$${costUsd.toFixed(4)}.`);
  console.log(`Sign in as ana@${SEED_DOMAIN} with "${SEED_PASSWORD}".`);
}

if (import.meta.main) {
  await seed();
  await pool.end();
}
