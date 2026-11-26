import { SignInForm } from "@bootcamp/auth/sign-in-form";
import { returnPath } from "../../rules/return-path";

type Search = { next?: string };

export default async function SignInPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { next } = await searchParams;
  return (
    <main className="sign-in">
      <h1>Sign in to learnwithparam</h1>
      <p>Sign in so the assistant can show your plan and open billing for you.</p>
      <SignInForm next={returnPath(next)} />
    </main>
  );
}
