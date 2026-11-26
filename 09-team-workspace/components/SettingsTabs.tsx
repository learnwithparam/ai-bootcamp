import Link from "next/link";

const TABS = [
  { href: "/memory", label: "Memory" },
  { href: "/connectors", label: "Connectors" },
];

// The two settings pages share one header, so they read as one place.
export function SettingsTabs({ current }: { current: "/memory" | "/connectors" }) {
  return (
    <header className="settings-head">
      <h1>Settings</h1>
      <nav className="tabs" aria-label="Settings">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="tab"
            aria-current={tab.href === current ? "page" : undefined}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
