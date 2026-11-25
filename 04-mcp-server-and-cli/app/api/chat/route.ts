import type { UIMessage } from "ai";
import { answer } from "../../../agent/agent";
import { auth } from "../../../auth/auth";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  try {
    const { messages } = (await request.json()) as { messages: UIMessage[] };
    return (await answer(messages, session?.user.id ?? null)).toUIMessageStreamResponse();
  } catch (error) {
    console.error("mcp-server-and-cli chat failed", error);
    return new Response("The assistant could not answer just now. Try again in a minute.", { status: 500 });
  }
}
