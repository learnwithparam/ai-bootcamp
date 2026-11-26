import { ask } from "../../../agent/agent";
import { auth } from "../../../auth/auth";

// "Ask in plain words": one question, one answer, with the tool calls that made it. The caller is the session.
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  // Each answer costs a model call, so only an account may ask. Its calls then show in its activity.
  if (!session) return Response.json({ error: "Sign in to ask in plain words." }, { status: 401 });
  const { question } = (await request.json()) as { question?: unknown };
  if (typeof question !== "string" || !question.trim())
    return Response.json({ error: "Type a question first." }, { status: 400 });
  if (question.length > 500)
    return Response.json({ error: "Keep the question under 500 characters." }, { status: 400 });
  try {
    const { text, calls } = await ask(question.trim(), session.user.id);
    return Response.json({ text, calls: calls.map(({ tool, input }) => ({ tool, input })) });
  } catch (error) {
    console.error("mcp-server-and-cli ask failed", error);
    return Response.json({ error: "No answer just now. Try again in a minute." }, { status: 500 });
  }
}
