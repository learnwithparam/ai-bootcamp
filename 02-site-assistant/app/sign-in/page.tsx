import { SignInForm } from "@bootcamp/auth/sign-in-form";

export default function SignInPage() {
  return (
    <main className="sign-in">
      <h1>Ask learnwithparam</h1>
      <p>Sign in so the assistant can show your plan and open billing for you.</p>
      <SignInForm />
    </main>
  );
}
