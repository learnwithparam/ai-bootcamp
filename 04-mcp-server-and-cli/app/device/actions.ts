"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "../../auth/auth";

// Only the session that checked the code can approve or deny it: better-auth ties the code to that session.
export async function approve(form: FormData) {
  await auth.api.deviceApprove({
    body: { userCode: String(form.get("userCode")) },
    headers: await headers(),
  });
  redirect("/device?done=approved");
}

export async function deny(form: FormData) {
  await auth.api.deviceDeny({ body: { userCode: String(form.get("userCode")) }, headers: await headers() });
  redirect("/device?done=denied");
}
