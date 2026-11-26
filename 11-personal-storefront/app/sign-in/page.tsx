import { SignInForm } from "@bootcamp/auth/sign-in-form";

// Where a sign-in may send you: the shop, or Merchandising for the team. Nothing else, so a link cannot send you off the site.
const PLACES = ["/", "/merchandising", "/basket"];

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="sign-in">
      <h1>Fernhill Grocer</h1>
      <p>Sign in and the shop remembers how you shop, on any device. The team signs in here too.</p>
      <SignInForm next={next && PLACES.includes(next) ? next : "/"} />
    </main>
  );
}
