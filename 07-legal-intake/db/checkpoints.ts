import { pool } from "@bootcamp/db";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

// LangGraph saves the graph's state here after every step, keyed by the request's id.
// A request paused for a lawyer waits in these tables, so a restart or a new deploy loses nothing.
export const checkpoints = new PostgresSaver(pool, undefined, { schema: "legal_intake_graph" });
