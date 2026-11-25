import { currentSession } from "@bootcamp/auth";
import { finishConnect } from "../../../../agent/oauth";
import { roleOf } from "../../../../db/queries";
import { CONNECTOR_FAILURES } from "../../../../rules/connectors";

// The connector's sign-in server sends the person back here with a one-time code.
// The result goes back to the Connectors page as a short message, never as error details.
export async function GET(request: Request) {
  const session = await currentSession(request.headers);
  if (!session || !(await roleOf(session.user.id))) return new Response("Not found", { status: 404 });
  const back = new URL("/connectors", request.url);
  try {
    const name = await finishConnect(session.user.id, new URL(request.url).searchParams);
    back.searchParams.set("connected", name);
  } catch (error) {
    console.error("team-workspace connect failed", error);
    back.searchParams.set("failed", CONNECTOR_FAILURES.callback);
  }
  return Response.redirect(back, 303);
}
