import { currentSession } from "@bootcamp/auth";
import { required } from "@bootcamp/model";
import type { UIMessage } from "ai";
import { answerVisitor } from "../../../agent/agent";
import { usageFor } from "../../../db/queries";
import { checkLimits, readLimits } from "../../../rules/limits";

// Signed-in visitors are counted by account. Others are counted by the address in the one header your proxy sets,
// named in SITE_ASSISTANT_IP_HEADER. Any other header can be typed by the visitor, so it is never read.
function visitorId(request: Request, userId: string | undefined): string {
  if (userId) return `user:${userId}`;
  const address = request.headers.get(required("SITE_ASSISTANT_IP_HEADER"));
  return `ip:${address?.trim() || "unknown"}`;
}

export async function POST(request: Request) {
  const session = await currentSession(request.headers);
  const visitor = {
    id: visitorId(request, session?.user.id),
    userId: session?.user.id ?? null,
    email: session?.user.email ?? null,
  };
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
