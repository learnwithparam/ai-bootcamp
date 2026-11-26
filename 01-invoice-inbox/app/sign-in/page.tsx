import { SignInForm } from "@bootcamp/auth/sign-in-form";

export default function SignInPage() {
  return (
    <main className="sign-in">
      <h1>Larder Group bills</h1>
      <p>
        The accounts payable team signs in here to review supplier bills, approve them and record payments.
      </p>
      <SignInForm next="/bills" />
    </main>
  );
}
