import { partyRecords } from "../../db/queries";
import { findConflicts } from "../../rules/conflicts";
import type { State } from "../graph";

// Step two, no model: every name in the request against every party in the firm's records.
// The names the client typed and the names the model read in the story are both checked.
export async function checkConflicts({ request, assessment }: Pick<State, "request" | "assessment">) {
  const others = [...request.otherParties, ...assessment.otherParties];
  return { conflicts: findConflicts(request.clientName, others, await partyRecords()) };
}
