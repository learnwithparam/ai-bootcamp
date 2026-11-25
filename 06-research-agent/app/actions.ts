"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { runResearch } from "../agent/agent";
import type { StartState } from "../components/ResearchForm";
import { startWithinLimits } from "../db/queries";
import { companyQuery } from "../rules/limits";
import { requireUser } from "./session";

// Saves a new report, answers at once, and runs the graph after the answer is sent.
// The report page reads the saved row, so it shows each step as it finishes.
export async function startResearch(_previous: StartState, form: FormData): Promise<StartState> {
  const user = await requireUser();
  const company = companyQuery(String(form.get("company") ?? ""));
  if (!company) return { error: "Type a company name or website, 2 to 100 characters." };
  const { id, refused } = await startWithinLimits(company, user.id);
  if (!id) return { error: refused };
  after(() => runResearch(id, company));
  redirect(`/reports/${id}`);
}
