import { currentSession } from "@bootcamp/auth";
import { invoicePdf } from "../../../../db/queries";

// Serves the uploaded PDF to signed-in people only, for the review page's viewer.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await currentSession(request.headers))) return new Response("Sign in first.", { status: 401 });
  const pdf = await invoicePdf((await params).id);
  if (!pdf) return new Response("No such invoice.", { status: 404 });
  return new Response(new Uint8Array(pdf), { headers: { "content-type": "application/pdf" } });
}
