"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { discoverSignIn } from "../agent/discover";
import { startConnect } from "../agent/oauth";
import { addConnector, allConnectors, disconnect, removeConnector } from "../db/connectors";
import { forget } from "../db/memories";
import { deleteChat } from "../db/queries";
import { type ConnectorForm, type SignIn, whyNotAdd } from "../rules/connectors";
import { requireAdmin, requireMember } from "./session";

// Every button here checks who pressed it first, because a server action is a public endpoint.

const field = (form: FormData, name: string) => String(form.get(name) ?? "");
const back = (key: "failed" | "connected" | "added", text: string) =>
  redirect(`/connectors?${key}=${encodeURIComponent(text)}`);

export async function forgetMemory(form: FormData) {
  const member = await requireMember();
  await forget(member.id, field(form, "id"));
  revalidatePath("/memory");
}

export async function removeChat(form: FormData) {
  const member = await requireMember();
  await deleteChat(field(form, "id"), member.id);
  redirect("/");
}

// Sends the person to the connector's own sign-in page. Its callback lands in app/api/connectors/callback.
export async function connect(form: FormData) {
  const member = await requireMember();
  let signIn: URL | null;
  try {
    signIn = await startConnect(field(form, "id"), member.id);
  } catch (error) {
    console.error("team-workspace connect failed", error);
    return back("failed", "That server could not start a sign-in. Check that it is running.");
  }
  redirect(signIn ? signIn.toString() : "/connectors");
}

export async function disconnectConnector(form: FormData) {
  const member = await requireMember();
  await disconnect(field(form, "id"), member.id);
  revalidatePath("/connectors");
}

// Admins only. The server must say who signs people in for it, or it is refused before anything is saved.
export async function addConnectorForTeam(form: FormData) {
  const admin = await requireAdmin();
  const connector: ConnectorForm = {
    name: field(form, "name"),
    url: field(form, "url"),
    clientId: field(form, "clientId"),
    clientSecret: field(form, "clientSecret"),
  };
  const refused = whyNotAdd(
    connector,
    (await allConnectors()).map((each) => each.name),
  );
  if (refused) return back("failed", refused);
  let signIn: SignIn;
  try {
    signIn = await discoverSignIn(connector.url);
  } catch (error) {
    console.error("team-workspace connector discovery failed", error);
    return back("failed", "That address did not answer as an MCP server with sign-in. Nothing was saved.");
  }
  await addConnector(connector, signIn, admin.id);
  back("added", connector.name);
}

export async function removeConnectorForTeam(form: FormData) {
  await requireAdmin();
  await removeConnector(field(form, "id"));
  revalidatePath("/connectors");
}
