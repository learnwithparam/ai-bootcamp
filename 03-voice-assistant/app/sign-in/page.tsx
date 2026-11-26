import { SignInForm } from "@bootcamp/auth/sign-in-form";

// Where a sign-in may send you: the caller's page, or the front desk. Nothing else, so a link cannot send you off the site.
const PLACES = ["/", "/desk", "/desk/diary"];

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="sign-in">
      <h1>Harbour Physio</h1>
      <p>The front desk signs in here, to read the phone calls and the diary.</p>
      <SignInForm next={next && PLACES.includes(next) ? next : "/desk"} />
    </main>
  );
}
