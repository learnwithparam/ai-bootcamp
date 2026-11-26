import { runById } from "../../../../db/runs";
import { requireMember } from "../../../session";

// The run's session file, exactly as the CLI wrote it, one event per line.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireMember();
  const run = await runById((await params).id);
  if (!run) return new Response("There is no such run.", { status: 404 });
  const body = run.events.map((event) => JSON.stringify(event)).join("\n");
  return new Response(`${body}\n`, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "content-disposition": `attachment; filename="run-${run.id}.jsonl"`,
    },
  });
}
