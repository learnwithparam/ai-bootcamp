import { currentSession } from "@bootcamp/auth";
import { createUIMessageStreamResponse, toUIMessageStream, type UIMessage } from "ai";
import { answerOwner } from "../../../agent/agent";
import { isOwner } from "../../../db/queries";
import { errorMessage } from "./error-message";

function logged(error: unknown): string {
  console.error("admin-assistant chat failed", error);
  return errorMessage(error);
}

// The same 404 as the pages, so the route does not tell a stranger it exists.
export async function POST(request: Request) {
  const session = await currentSession(request.headers);
  if (!session || !(await isOwner(session.user.id))) return new Response("Not found", { status: 404 });
  try {
    const { messages } = (await request.json()) as { messages: UIMessage[] };
    const reply = await answerOwner(messages, session.user.id);
    return createUIMessageStreamResponse({
      stream: toUIMessageStream({ stream: reply.stream, onError: logged }),
    });
  } catch (error) {
    console.error("admin-assistant chat failed", error);
    return new Response(errorMessage(error), { status: 500 });
  }
}
