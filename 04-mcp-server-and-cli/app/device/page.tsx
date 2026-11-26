import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, SCOPES } from "../../auth/auth";
import { GrantCard } from "../../components/GrantCard";
import { cliClientId } from "../../db/queries";
import { approve, deny } from "./actions";

type Search = Promise<{ user_code?: string; done?: string }>;

// `learnwithparam login` prints a short code and this page's address. You type the code here, signed in,
// and approve. Only our own CLI can be approved: a code from any other app is refused.
export default async function DevicePage({ searchParams }: { searchParams: Search }) {
  const { user_code: userCode, done } = await searchParams;
  if (done) return <Finished approved={done === "approved"} />;
  if (!userCode) return <EnterCode />;
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) {
    redirect(`/sign-in?next=${encodeURIComponent(`/device?user_code=${userCode}`)}`);
  }
  const request = await auth.api
    .deviceVerify({ query: { user_code: userCode }, headers: requestHeaders })
    .catch((error: unknown) => {
      console.error("device code check failed", error);
      return null;
    });
  if (!request)
    return (
      <EnterCode error="That code is wrong or has expired. Run the login command in your terminal again for a new one." />
    );
  if (request.client_id !== (await cliClientId()))
    return <EnterCode error="That code is not from our CLI." />;
  return <Approve userCode={userCode} email={session.user.email} />;
}

function EnterCode({ error }: { error?: string }) {
  return (
    <main className="sign-in">
      <h1>Sign in the learnwithparam CLI</h1>
      <p>Type the code your terminal shows.</p>
      <form className="sign-in-form">
        <input name="user_code" className="field" placeholder="ABCD-2345" required autoComplete="off" />
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className="button button-primary">
          Continue
        </button>
      </form>
    </main>
  );
}

// The CLI asks for the scopes the server hands it at login (SCOPES), so the page can name them.
function Approve({ userCode, email }: { userCode: string; email: string }) {
  return (
    <GrantCard appName="the learnwithparam CLI" from="terminal" email={email} scopes={SCOPES.split(" ")}>
      <div className="grant-code">
        <span>Check this matches the code in your terminal</span>
        <output className="device-code">{userCode}</output>
      </div>
      <form className="grant-actions">
        <input type="hidden" name="userCode" value={userCode} />
        <button type="submit" formAction={approve} className="button button-primary">
          Approve
        </button>
        <button type="submit" formAction={deny} className="button button-quiet">
          Deny
        </button>
      </form>
    </GrantCard>
  );
}

function Finished({ approved }: { approved: boolean }) {
  return (
    <main className="sign-in">
      <h1>{approved ? "The CLI is signed in" : "Denied"}</h1>
      <p>{approved ? "Go back to your terminal." : "The CLI was not signed in. You can close this tab."}</p>
    </main>
  );
}
