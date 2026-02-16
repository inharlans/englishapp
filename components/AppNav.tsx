import Link from "next/link";

const links: Array<{ href: string; label: string }> = [
  { href: "/", label: "Home" },
  { href: "/wordbooks", label: "Wordbooks" },
  { href: "/wordbooks/market", label: "Market" },
  { href: "/offline", label: "Offline" },
  { href: "/pricing", label: "Pricing" }
];

export function AppNav() {
  return (
    <nav
      aria-label="주요 메뉴"
      className="ui-card-soft mb-6 p-4"
    >
      <div className="flex flex-wrap items-center gap-2" role="list">
        {links.map((link) => (
          <Link
            key={link.href}
            href={{ pathname: link.href }}
            role="listitem"
            className="ui-btn-secondary px-3 py-2 text-sm"
          >
            {link.label}
          </Link>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/login"
            className="ui-btn-secondary px-3 py-2 text-sm"
          >
            Login
          </Link>
          <Link href="/logout" className="ui-btn-primary px-3 py-2 text-sm">
            Logout
          </Link>
        </div>
      </div>
    </nav>
  );
}
