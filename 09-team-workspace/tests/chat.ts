import { parseJsonEventStream, readUIMessageStream, type UIMessage, uiMessageChunkSchema } from "ai";
import { APP_URL } from "../agent/oauth";
import { POST } from "../app/api/chat/route";

export type ToolPart = {
  type: string;
  toolName?: string;
  toolCallId: string;
  state: string;
  input: Record<string, unknown>;
  output?: unknown;
  approval?: { id: string; approved?: boolean };
};

export const user = (text: string): UIMessage => ({
  id: crypto.randomUUID(),
  role: "user",
  parts: [{ type: "text", text }],
});

// Memory tools are typed (`tool-remember`); connector tools come from MCP as dynamic tools with a name.
const nameOf = (part: { type: string; toolName?: string }) =>
  part.type === "dynamic-tool" ? (part.toolName ?? "") : part.type.replace(/^tool-/, "");

export const toolParts = (message: UIMessage | undefined, name: string) =>
  (message?.parts ?? []).filter(
    (part) => (part.type.startsWith("tool-") || part.type === "dynamic-tool") && nameOf(part).endsWith(name),
  ) as unknown as ToolPart[];

export const textOf = (message: UIMessage | undefined) =>
  (message?.parts ?? []).map((part) => (part.type === "text" ? part.text : "")).join("");

type Sent = { status: number; message?: UIMessage; error: string | null; refusal?: string };

// One message through the real chat route, as the browser sends it: the chat id and the newest message only.
// The reply is read the way the browser reads it. `continuing` is the reply an approval answers.
export async function send(
  cookie: string,
  chatId: string,
  message: UIMessage,
  continuing?: UIMessage,
): Promise<Sent> {
  const request = new Request(`${APP_URL}/api/chat`, {
    method: "POST",
    headers: { cookie, host: new URL(APP_URL).host, "content-type": "application/json" },
    body: JSON.stringify({ chatId, message }),
  });
  const response = await POST(request);
  if (!response.ok || !response.body)
    return { status: response.status, error: null, refusal: await response.text() };
  let error: string | null = null;
  let reply: UIMessage | undefined = continuing;
  const chunks = parseJsonEventStream({ stream: response.body, schema: uiMessageChunkSchema }).pipeThrough(
    new TransformStream({
      transform: (parsed, controller) => (parsed.success ? controller.enqueue(parsed.value) : undefined),
    }),
  );
  for await (const each of readUIMessageStream({
    message: continuing,
    stream: chunks,
    onError: (e) => (error = String(e)),
  }))
    reply = each;
  return { status: response.status, message: reply, error };
}
