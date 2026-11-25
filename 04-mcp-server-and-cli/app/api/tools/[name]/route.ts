import { findTool } from "../../../../agent/tools/all";
import { SignInNeeded } from "../../../../agent/tools/tool";
import { auth } from "../../../../auth/auth";

// The web page's tool runner. The caller is the signed-in session, or nobody.
export async function POST(request: Request, { params }: { params: Promise<{ name: string }> }) {
  const tool = findTool((await params).name);
  if (!tool) return Response.json({ error: "No tool with that name." }, { status: 404 });
  const session = await auth.api.getSession({ headers: request.headers });
  try {
    return Response.json(await tool.run(await request.json(), session?.user.id ?? null));
  } catch (error) {
    if (error instanceof SignInNeeded) return Response.json({ error: error.message }, { status: 401 });
    console.error(`tool ${tool.name} failed`, error);
    return Response.json(
      { error: error instanceof Error ? error.message : "The tool failed." },
      { status: 400 },
    );
  }
}
