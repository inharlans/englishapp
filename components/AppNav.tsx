"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links: Array<{ href: string; label: string }> = [
  { href: "/", label: "Home" },
  { href: "/wordbooks", label: "Wordbooks" },
  { href: "/wordbooks/market", label: "Market" },
  { href: "/offline", label: "Offline" },
  { href: "/pricing", label: "Pricing" }
];

export function AppNav({ isLoggedIn }: { isLoggedIn: boolean }) {
  const pathname = usePathname();

  return (
    <nav aria-label="주요 메뉴" className="ui-card-soft mb-6 p-4">
      <div className="flex flex-wrap items-center gap-2" role="list">
        {links.map((link) => (
          <Link
            key={link.href}
            href={{ pathname: link.href }}
            role="listitem"
            className={[
              "px-3 py-2 text-sm",
              pathname === link.href ? "ui-btn-primary" : "ui-btn-secondary"
            ].join(" ")}
          >
            {link.label}
          </Link>
        ))}
        <div className="ml-auto flex items-center gap-2">
          {!isLoggedIn ? (
            <Link href="/login" className="ui-btn-secondary px-3 py-2 text-sm">
              Login
            </Link>
          ) : null}
          {isLoggedIn ? (
            <Link href="/logout" className="ui-btn-ghost px-3 py-2 text-sm">
              Logout
            </Link>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
