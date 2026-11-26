import { conversationFor, latestFor, messagesOf } from "../../../db/conversations";
import { ownerName } from "../../../rules/conversation";
import { cookieHeaders, writerOf } from "../visitor";

// GET /api/conversation            the visitor's open conversation, so the messenger picks up where it was
// GET /api/conversation?id=<id>    one conversation, polled while a person on the team has it
export async function GET(request: Request) {
  const writer = await writerOf(request);
  const id = new URL(request.url).searchParams.get("id");
  const conversation = id ? await conversationFor(id, writer.owner) : await latestFor(writer.owner);
  const headers = cookieHeaders(writer);
  if (!conversation) return Response.json({ conversation: null }, { status: id ? 404 : 200, headers });
  return Response.json(
    {
      conversation: {
        id: conversation.id,
        owner: conversation.owner,
        ownerName: ownerName(conversation),
        assigned: Boolean(conversation.assigneeName),
        closed: Boolean(conversation.closedAt),
      },
      messages: await messagesOf(conversation.id),
    },
    { headers },
  );
}
