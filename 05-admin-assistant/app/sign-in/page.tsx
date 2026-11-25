import { SignInForm } from "@bootcamp/auth/sign-in-form";

export default function SignInPage() {
  return (
    <main className="sign-in">
      <h1>Admin assistant</h1>
      <p>Sign in with the owner's account. Other accounts see a not-found page.</p>
      <SignInForm />
    </main>
  );
}
