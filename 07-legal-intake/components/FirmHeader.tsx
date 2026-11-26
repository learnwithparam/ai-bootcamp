import Link from "next/link";

// The firm's own site header. Clients see Harlow Legal, never the software behind it.
export function FirmHeader() {
  return (
    <header className="firm-header">
      <Link href="/" className="firm-mark">
        <span aria-hidden="true">H</span> Harlow Legal
      </Link>
      <nav aria-label="Practice areas" className="firm-areas">
        <span>Employment</span>
        <span>Tenancy</span>
        <span>Consumer</span>
      </nav>
      <Link href="/sign-in" className="firm-staff">
        Staff sign in
      </Link>
    </header>
  );
}
