import { SignInForm } from "@bootcamp/auth/sign-in-form";

export default function SignInPage() {
  return (
    <main className="sign-in">
      <h1>Research agent</h1>
      <p>
        Sign in to research companies. Your reports are saved to your account, and only you can open them.
      </p>
      <SignInForm />
    </main>
  );
}
