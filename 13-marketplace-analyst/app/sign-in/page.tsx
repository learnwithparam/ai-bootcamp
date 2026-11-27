import { SignInForm } from "@bootcamp/auth/sign-in-form";

export default function SignInPage() {
  return (
    <main className="sign-in">
      <h1>Sign in to the marketplace analyst</h1>
      <p>Ask about orders and reviews. Your questions are saved to your account.</p>
      <SignInForm />
    </main>
  );
}
