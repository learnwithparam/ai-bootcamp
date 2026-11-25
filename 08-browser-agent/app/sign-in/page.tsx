import { SignInForm } from "@bootcamp/auth/sign-in-form";

export default function SignInPage() {
  return (
    <main className="sign-in">
      <h1>Browser agent</h1>
      <p>The firm's operators sign in here to turn client emails into intake requests.</p>
      <SignInForm next="/" />
    </main>
  );
}
