import { SignInForm } from "@bootcamp/auth/sign-in-form";

export default function SignInPage() {
  return (
    <main className="sign-in">
      <h1>Research agent</h1>
      <p>
        Sign in to your team's accounts. Every company is researched from the live web, and the whole team
        sees the results.
      </p>
      <SignInForm />
    </main>
  );
}
