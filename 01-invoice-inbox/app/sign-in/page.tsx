import { SignInForm } from "@bootcamp/auth/sign-in-form";

export default function SignInPage() {
  return (
    <main className="sign-in">
      <h1>Invoice inbox</h1>
      <p>Sign in to read supplier invoices and clear the ones that do not match.</p>
      <SignInForm />
    </main>
  );
}
