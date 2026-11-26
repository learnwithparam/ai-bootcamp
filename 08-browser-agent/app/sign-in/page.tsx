import { SignInForm } from "@bootcamp/auth/sign-in-form";

export default function SignInPage() {
  return (
    <main className="sign-in">
      <h1>Harlow Legal intake desk</h1>
      <p>
        The intake team signs in here. The agent turns each client email into a request on the intake portal.
      </p>
      <SignInForm next="/" />
    </main>
  );
}
