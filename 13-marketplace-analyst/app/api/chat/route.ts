import { currentSession } from "@bootcamp/auth";
import { createUIMessageStreamResponse } from "ai";
import { converse } from "../../../agent/converse";
import { questionFrom } from "../../../rules/question";

// The browser sends the conversation id and its newest message. Who is asking comes from the session.
export async function POST(request: Request) {
  const session = await currentSession(request.headers);
  if (!session?.user) return new Response("Sign in to ask.", { status: 401 });
  try {
    const asked = questionFrom(await request.json());
    if (typeof asked === "string") return new Response(asked, { status: 400 });
    const stream = await converse(asked.conversationId, session.user.id, asked.message);
    if (!stream) return new Response("Not found", { status: 404 });
    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    console.error("marketplace-analyst chat failed", error);
    return new Response("The analyst could not answer just now. Try again in a minute.", { status: 500 });
  }
}
