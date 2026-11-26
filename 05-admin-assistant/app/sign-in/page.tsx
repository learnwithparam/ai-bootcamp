import { SignInForm } from "@bootcamp/auth/sign-in-form";

export default function SignInPage() {
  return (
    <main className="sign-in">
      <h1>Admin assistant</h1>
      <p>For the school's team. Owners and staff sign in here.</p>
      <SignInForm />
    </main>
  );
}
