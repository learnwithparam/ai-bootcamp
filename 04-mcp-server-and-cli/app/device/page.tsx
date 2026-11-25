import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "../../auth/auth";
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
  if (!(await auth.api.getSession({ headers: requestHeaders }))) {
    redirect(`/sign-in?next=${encodeURIComponent(`/device?user_code=${userCode}`)}`);
  }
  const request = await auth.api
    .deviceVerify({ query: { user_code: userCode }, headers: requestHeaders })
    .catch((error: unknown) => {
      console.error("device code check failed", error);
      return null;
    });
  if (!request)
    return <EnterCode error="That code is wrong or has expired. Run `learnwithparam login` again." />;
  if (request.client_id !== (await cliClientId()))
    return <EnterCode error="That code is not from our CLI." />;
  return <Approve userCode={userCode} />;
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

function Approve({ userCode }: { userCode: string }) {
  return (
    <main className="sign-in">
      <h1>Let the learnwithparam CLI act as you?</h1>
      <p>
        It can search the catalog, read your saved list and add to it. Approve only if you just ran{" "}
        <code>bun run cli login</code> and it printed this code:
      </p>
      <p className="device-code">{userCode}</p>
      <form className="approval-actions">
        <input type="hidden" name="userCode" value={userCode} />
        <button type="submit" formAction={approve} className="button button-primary">
          Approve
        </button>
        <button type="submit" formAction={deny} className="button">
          Deny
        </button>
      </form>
    </main>
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
