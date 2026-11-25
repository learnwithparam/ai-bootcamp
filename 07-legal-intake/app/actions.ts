"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { startIntake } from "../agent/agent";
import type { FormState } from "../components/IntakeForm";
import { takeRequest } from "../db/queries";
import { readRequest, whyNotTake } from "../rules/form";

// The public form. No account: it saves the request, answers at once with the client's private link,
// and runs the graph after the answer is sent. The graph stops when it reaches the lawyer.
export async function sendRequest(_previous: FormState, form: FormData): Promise<FormState> {
  const fields = Object.fromEntries([...form.entries()].map(([key, value]) => [key, String(value)]));
  const { request, error } = readRequest(fields);
  if (!request) return { error };
  const taken = await takeRequest(request, whyNotTake);
  if ("refused" in taken) return { error: taken.refused };
  after(() => startIntake(taken.id, request));
  redirect(`/requests/${taken.token}`);
}
