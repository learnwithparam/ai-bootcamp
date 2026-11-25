import { currentSession } from "@bootcamp/auth";
import { createUIMessageStreamResponse, toUIMessageStream, type UIMessage } from "ai";
import { answerTeam } from "../../../agent/agent";
import { roleOf } from "../../../db/queries";
import { errorMessage } from "./error-message";

function logged(error: unknown): string {
  console.error("admin-assistant chat failed", error);
  return errorMessage(error);
}

// The same 404 as the pages, so the route does not tell a stranger it exists. Owners and staff may use it.
export async function POST(request: Request) {
  const session = await currentSession(request.headers);
  if (!session || !(await roleOf(session.user.id))) return new Response("Not found", { status: 404 });
  try {
    const { messages, page } = (await request.json()) as { messages: UIMessage[]; page?: string };
    const reply = await answerTeam(messages, session.user.id, typeof page === "string" ? page : "");
    return createUIMessageStreamResponse({
      stream: toUIMessageStream({ stream: reply.stream, onError: logged }),
    });
  } catch (error) {
    console.error("admin-assistant chat failed", error);
    return new Response(errorMessage(error), { status: 500 });
  }
}
