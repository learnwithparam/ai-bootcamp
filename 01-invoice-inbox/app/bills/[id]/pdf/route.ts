import { currentSession } from "@bootcamp/auth";
import { billPdf } from "../../../../db/bills";

// Serves the uploaded PDF to signed-in people only, for the bill page's viewer.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await currentSession(request.headers))) return new Response("Sign in first.", { status: 401 });
  const pdf = await billPdf((await params).id);
  if (!pdf) return new Response("No such bill.", { status: 404 });
  return new Response(new Uint8Array(pdf), {
    headers: { "content-type": "application/pdf", "cache-control": "private, max-age=3600" },
  });
}
