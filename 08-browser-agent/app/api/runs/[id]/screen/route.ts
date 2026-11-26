import { currentSession } from "@bootcamp/auth";
import { roleOf } from "../../../../../db/people";
import { screenOf } from "../../../../../db/queries";

// The browser picture for one run, saved after each step. Only the intake desk may see it.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await currentSession(request.headers);
  if (!session || !(await roleOf(session.user.id))) return new Response("Not found", { status: 404 });
  const screen = await screenOf((await params).id);
  if (!screen) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(screen, "base64"), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, no-store" },
  });
}
