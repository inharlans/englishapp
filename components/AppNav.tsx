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
      className="mb-6 rounded-2xl border border-white/60 bg-white/90 p-4 shadow-[0_16px_36px_-24px_rgba(15,23,42,0.45)] backdrop-blur"
    >
      <div className="flex flex-wrap items-center gap-2" role="list">
        {links.map((link) => (
          <Link
            key={link.href}
            href={{ pathname: link.href }}
            role="listitem"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:-translate-y-0.5 hover:border-teal-300 hover:text-slate-900"
          >
            {link.label}
          </Link>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-teal-300 hover:text-slate-900"
          >
            Login
          </Link>
          <Link
            href="/logout"
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Logout
          </Link>
        </div>
      </div>
    </nav>
  );
}
