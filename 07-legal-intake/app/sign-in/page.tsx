import { SignInForm } from "@bootcamp/auth/sign-in-form";

export default function SignInPage() {
  return (
    <main className="sign-in">
      <h1>Harlow Legal staff</h1>
      <p>Lawyers and paralegals sign in here to work on the intake board. Clients do not need an account.</p>
      <SignInForm next="/queue" />
    </main>
  );
}
