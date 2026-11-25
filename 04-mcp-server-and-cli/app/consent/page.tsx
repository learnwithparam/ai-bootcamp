import { verifyOAuthQueryParams } from "@better-auth/oauth-provider";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "../../auth/auth";
import { Decide } from "./Decide";

type Search = Promise<Record<string, string | string[]>>;

// Back to the exact query that was signed. A key can repeat (ba_param), and Next gives a repeated key as a list.
function signedQuery(search: Record<string, string | string[]>): URLSearchParams {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    for (const each of [value].flat()) query.append(key, each);
  }
  return query;
}

// Shown once per app: "Claude wants to use your learnwithparam tools". The request is signed by our server,
// so a link someone edited (another app name, more scopes) is refused before anything is shown.
export default async function ConsentPage({ searchParams }: { searchParams: Search }) {
  const query = signedQuery(await searchParams);
  if (!(await verifyOAuthQueryParams(query.toString(), (await auth.$context).secret))) notFound();
  const requestHeaders = await headers();
  if (!(await auth.api.getSession({ headers: requestHeaders }))) redirect("/sign-in");
  const client = await auth.api.getOAuthClientPublic({
    query: { client_id: query.get("client_id") ?? "" },
    headers: requestHeaders,
  });
  return (
    <main className="sign-in">
      <h1>{client.client_name ?? "An app"} wants to use your learnwithparam tools</h1>
      <p>It will be able to search the catalog, read your saved list and add to it, as you.</p>
      <p className="label">Asked for: {query.get("scope")}</p>
      <Decide />
    </main>
  );
}
