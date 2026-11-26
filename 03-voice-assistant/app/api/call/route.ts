import { required } from "@bootcamp/model";
import { AccessToken, AgentDispatchClient } from "livekit-server-sdk";
import { closeStaleCalls, reserveCall, settleCall } from "../../../db/calls";
import { AGENT_NAME } from "../../../rules/clinic";
import { NO_USAGE } from "../../../rules/cost";
import { CALL_SECONDS } from "../../../rules/limits";
import { callerOf } from "../../caller";

// Placing a call. The call takes its place in the ledger first, so the limits hold before anything
// costs money. Then the room is opened, the phone agent is sent to it, and the browser gets a pass
// that lets it join that one room for no longer than one call.
export async function POST(request: Request) {
  const { caller, setCookie } = callerOf(request);
  const cookie: Record<string, string> = setCookie ? { "set-cookie": setCookie } : {};
  await closeStaleCalls();
  const placed = await reserveCall(caller);
  if ("blocked" in placed)
    return Response.json({ blocked: placed.blocked }, { status: 429, headers: cookie });
  const room = `call-${placed.id}`;
  try {
    const url = required("LIVEKIT_URL");
    const [key, secret] = [required("LIVEKIT_API_KEY"), required("LIVEKIT_API_SECRET")];
    await new AgentDispatchClient(url.replace("wss://", "https://"), key, secret).createDispatch(
      room,
      AGENT_NAME,
      {
        metadata: JSON.stringify({ callId: placed.id }),
      },
    );
    const pass = new AccessToken(key, secret, {
      identity: `caller-${caller.slice(0, 8)}`,
      ttl: CALL_SECONDS + 60,
    });
    pass.addGrant({ room, roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: true });
    return Response.json({ callId: placed.id, url, token: await pass.toJwt() }, { headers: cookie });
  } catch (error) {
    console.error("The call could not be placed:", error);
    await settleCall(placed.id, { seconds: 0, costUsd: 0, usage: NO_USAGE, because: "could not connect" });
    return Response.json(
      { blocked: "The line could not connect. Please try again." },
      { status: 502, headers: cookie },
    );
  }
}
