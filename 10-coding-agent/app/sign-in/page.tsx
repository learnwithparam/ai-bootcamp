import { SignInForm } from "@bootcamp/auth/sign-in-form";

export default function SignInPage() {
  return (
    <main className="sign-in">
      <h1>Coding agent runs</h1>
      <p>
        The team signs in here. Developers send runs from the terminal, and reviewers read each one before its
        change is merged.
      </p>
      <SignInForm next="/" />
    </main>
  );
}
