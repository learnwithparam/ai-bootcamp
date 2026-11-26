import Link from "next/link";

const SITE = "https://www.learnwithparam.com";
const NAV = [
  { label: "Courses", href: "/" },
  { label: "Live labs", href: `${SITE}/labs` },
  { label: "Buildcamp", href: `${SITE}/cohort` },
  { label: "For teams", href: `${SITE}/for-teams` },
];

type Props = { userName: string | null; onTeam: boolean };

// The top of the site the messenger sits on. Pages other than this one open the real site in a new tab.
export function SiteHeader({ userName, onTeam }: Props) {
  return (
    <header className="site-header">
      <Link href="/" className="site-brand">
        learnwithparam
      </Link>
      <nav aria-label="Site" className="site-nav">
        {NAV.map((item) =>
          item.href.startsWith("/") ? (
            <Link key={item.label} href={item.href} aria-current="page">
              {item.label}
            </Link>
          ) : (
            <a key={item.label} href={item.href} target="_blank" rel="noreferrer">
              {item.label}
            </a>
          ),
        )}
      </nav>
      <div className="site-account">
        {onTeam ? (
          <Link href="/inbox" className="button button-quiet">
            Support inbox
          </Link>
        ) : null}
        {userName ? (
          <span className="site-user">{userName}</span>
        ) : (
          <Link href="/sign-in" className="button">
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
