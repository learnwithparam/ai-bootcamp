"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { processInvoice } from "../agent/agent";
import type { DecisionState } from "../components/DecisionForm";
import type { UploadState } from "../components/UploadBox";
import { recordDecision } from "../db/queries";
import { requireUser } from "./session";

// Reads the uploaded PDFs at the same time. A file the model cannot read is named on screen,
// and the reason goes to the server log.
export async function uploadInvoices(_previous: UploadState, form: FormData): Promise<UploadState> {
  const user = await requireUser();
  const files = form
    .getAll("invoices")
    .filter((value): value is File => value instanceof File && value.size > 0);
  const failures = await Promise.all(files.map((file) => readOne(file, user.name)));
  revalidatePath("/");
  const failed = failures.filter((failure) => failure !== "");
  return { read: files.length - failed.length, failed };
}

// Returns why the file failed, or an empty string when it was read and saved.
async function readOne(file: File, uploadedBy: string): Promise<string> {
  if (file.type !== "application/pdf") return `${file.name} is not a PDF.`;
  try {
    await processInvoice(Buffer.from(await file.arrayBuffer()), file.name, uploadedBy);
    return "";
  } catch (error) {
    console.error(`Reading ${file.name} failed:`, error);
    return `${file.name} could not be read. The server log has the reason.`;
  }
}

// A person clears an exception. The note says why, and is kept with the decision.
export async function decideInvoice(_previous: DecisionState, form: FormData): Promise<DecisionState> {
  const user = await requireUser();
  const id = String(form.get("id"));
  const decision = form.get("decision");
  const note = String(form.get("note") ?? "").trim();
  if (decision !== "approved" && decision !== "rejected") return { error: "Choose approve or reject." };
  if (!note) return { error: "Write a note that says why." };
  if (!(await recordDecision(id, decision, user.name, note))) {
    return { error: "This invoice is no longer waiting. Someone may have decided it already." };
  }
  revalidatePath("/");
  redirect("/");
}
