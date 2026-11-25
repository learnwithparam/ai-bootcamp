import { SignInForm } from "@bootcamp/auth/sign-in-form";

export default function SignInPage() {
  return (
    <main className="sign-in">
      <h1>Legal intake</h1>
      <p>Lawyers sign in here to review requests. Clients do not need an account.</p>
      <SignInForm next="/queue" />
    </main>
  );
}
