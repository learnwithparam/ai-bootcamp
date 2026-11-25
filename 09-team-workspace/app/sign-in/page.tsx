import { SignInForm } from "@bootcamp/auth/sign-in-form";

export default function SignInPage() {
  return (
    <main className="sign-in">
      <h1>Team workspace</h1>
      <p>Sign in with your team account. An account that is not in the team sees a not-found page.</p>
      <SignInForm />
    </main>
  );
}
