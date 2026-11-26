import { pool } from "@bootcamp/db";
import { freshDesk } from "../db/desk";
import { INBOX } from "../db/inbox";
import { moveRun, runById, startRun } from "../db/queries";
import { STOPPABLE, whyNotStart } from "../rules/run";
import { runEmail, sendApproved } from "./agent";
import { INTAKE } from "./portal";

// bun run seed browser-agent
// The intake desk, then real runs on six of its emails, the same way the Run the agent button does it:
// a real browser on the real portal (product 07 must be running), and the real models. About a cent here, plus the portal's own replies, and a few minutes.
// Ruth's request is sent, approved by the lead if the model was unsure. Marta's, in Spanish, is taken over by the
// assistant. The sales pitch, the hidden orders and the one-line email are stopped. Lewis's is left as the model left it.
// The other six emails stay new, for you to run.

const RUNS = [
  "Ruth Okonkwo: My last month's pay",
  "Lewis Grant: Care home fees for my dad",
  "Dana from RankRise: Grow your law firm with SEO",
  "Kofi Mensah: Re: my landlord",
  "Sam Patel: Call me",
  "Marta Ruiz: Calefacción rota desde octubre",
];

if (!(await fetch(INTAKE).catch(() => null))?.ok)
  throw new Error(`Start the intake portal first: bun run dev legal-intake (expected on ${INTAKE}).`);

// The portal requests an earlier seed made, so running it again does not fill the lawyers' queue twice.
const senders = [...new Set(INBOX.map((email) => email.fromEmail))];
const { rows } = await pool.query<{ id: string }>(
  "delete from legal_intake.intakes where client_email = any($1) returning id",
  [senders],
);
for (const table of ["checkpoint_writes", "checkpoint_blobs", "checkpoints"])
  await pool.query(`delete from legal_intake_graph.${table} where thread_id = any($1)`, [
    rows.map((row) => row.id),
  ]);

const desk = await freshDesk();
const runIds = new Map<string, string>();
for (const key of RUNS) {
  const started = await startRun(desk.emails.get(key) ?? "", whyNotStart);
  if ("refused" in started) throw new Error(`${key}: ${started.refused}`);
  await runEmail(started.id);
  runIds.set(key, started.id);
}

const ruth = runIds.get(RUNS[0] ?? "") ?? "";
if (await moveRun(ruth, ["waiting"], "submitting", { decidedBy: "Nadia Rahman" })) await sendApproved(ruth);
const marta = runIds.get(RUNS[5] ?? "") ?? "";
await moveRun(marta, STOPPABLE, "taken_over", {
  decidedBy: "Owen Price",
  reason: "Owen Price took it over to send by hand.",
});

for (const [key, id] of runIds) {
  const run = await runById(id);
  console.log(`${key}: ${run?.status} (${run?.reason ?? ""}) $${run?.cost.toFixed(4)}`);
}
process.exit(0);
