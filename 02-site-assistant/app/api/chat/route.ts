import { currentSession } from "@bootcamp/auth";
import type { UIMessage } from "ai";
import { answerVisitor } from "../../../agent/agent";
import { usageFor } from "../../../db/queries";
import { checkLimits, readLimits } from "../../../rules/limits";

// Behind a proxy the visitor's address is in a header. Signed-in visitors are counted by account instead.
function visitorId(request: Request, userId: string | undefined): string {
  if (userId) return `user:${userId}`;
  const forwarded = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for");
  return `ip:${forwarded?.split(",")[0]?.trim() || "local"}`;
}

export async function POST(request: Request) {
  const session = await currentSession(request.headers);
  const visitor = { id: visitorId(request, session?.user.id), email: session?.user.email ?? null };
  const gate = checkLimits(await usageFor(visitor.id), readLimits(process.env));
  if (!gate.open) return new Response(gate.message, { status: gate.status });
  try {
    const { messages } = (await request.json()) as { messages: UIMessage[] };
    const { reply } = await answerVisitor(messages, visitor, new URL("/", request.url).toString());
    return reply.toUIMessageStreamResponse();
  } catch (error) {
    console.error("site-assistant chat failed", error);
    return new Response("The assistant could not answer just now. Try again in a minute.", { status: 500 });
  }
}
