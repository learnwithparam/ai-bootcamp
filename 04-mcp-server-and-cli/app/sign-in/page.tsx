import { samePath } from "../session";
import { SignIn } from "./SignIn";

type Search = Promise<{ sig?: string; next?: string }>;

// Claude, Cursor and the CLI send people here to sign in. A signed OAuth request ("sig") means the sign-in
// continues that request by itself; otherwise the page opens `next`.
export default async function SignInPage({ searchParams }: { searchParams: Search }) {
  const { sig, next } = await searchParams;
  return (
    <main className="sign-in">
      <h1>learnwithparam tools</h1>
      <p>Sign in so your saved list follows you into Claude, Cursor and the terminal.</p>
      <SignIn next={sig ? null : samePath(next)} />
    </main>
  );
}
