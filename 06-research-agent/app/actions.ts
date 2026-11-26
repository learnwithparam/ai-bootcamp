"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { runResearch } from "../agent/agent";
import type { AddState } from "../components/AddAccounts";
import { assignReport, findReport, startWithinLimits, takeReport, teamPeople } from "../db/queries";
import { companiesFrom } from "../rules/limits";
import { may, ownerOfNew } from "../rules/team";
import { requireMember } from "./session";

// Saves a row per company, answers at once, and researches them all after the answer is sent.
// The table reads the saved rows, so each cell fills in as its topic finishes.
export async function addAccounts(_previous: AddState, form: FormData): Promise<AddState> {
  const member = await requireMember();
  const companies = companiesFrom(String(form.get("companies") ?? ""));
  if (companies.length === 0) return { error: "Type a company name or website, one per line." };
  const { ids, refused } = await startWithinLimits(companies, member.id, ownerOfNew(member.role, member.id));
  if (!ids) return { error: refused };
  after(() => Promise.all(ids.map((id, index) => runResearch(id, companies[index] ?? ""))));
  revalidatePath("/accounts");
  return { added: ids.length };
}

export async function takeAccount(form: FormData) {
  const member = await requireMember();
  const report = await findReport(String(form.get("id")));
  if (!report || !may(member.role, "take", report)) return;
  await takeReport(report.id, member.id);
  revalidatePath("/accounts");
}

// Only a sales lead gives accounts out, and only to someone on the team.
export async function assignAccount(form: FormData) {
  const member = await requireMember();
  if (!may(member.role, "assign")) return;
  const report = await findReport(String(form.get("id")));
  const ownerId = String(form.get("ownerId") ?? "");
  const team = await teamPeople();
  if (!report || (ownerId && !team.some((person) => person.id === ownerId))) return;
  await assignReport(report.id, ownerId || null);
  revalidatePath("/accounts");
}
