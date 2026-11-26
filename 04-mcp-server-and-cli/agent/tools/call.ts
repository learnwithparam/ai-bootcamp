import { recordCall } from "../../db/activity";
import type { CatalogTool } from "./tool";

// Who is calling, and through which way in. The account always comes from that way in's own sign-in.
export type Caller = { userId: string | null; via: "page" | "ask" | "app"; clientId?: string | null };

// The one place a tool runs. Every way in calls this, so every call made with an account lands in
// that account's activity, whether it worked or failed. A signed-out call belongs to nobody, so it is not kept.
export async function callTool(tool: CatalogTool, input: unknown, caller: Caller): Promise<unknown> {
  const started = performance.now();
  const record = async (outcome: "done" | "failed", message: string | null) => {
    if (!caller.userId) return;
    await recordCall({
      userId: caller.userId,
      via: caller.via,
      clientId: caller.clientId ?? null,
      tool: tool.name,
      input: input ?? {},
      outcome,
      message,
      ms: Math.round(performance.now() - started),
    });
  };
  try {
    const output = await tool.run(input, caller.userId);
    await record("done", null);
    return output;
  } catch (error) {
    await record("failed", error instanceof Error ? error.message : String(error));
    throw error;
  }
}
