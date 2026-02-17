"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links: Array<{ href: string; label: string }> = [
  { href: "/", label: "홈" },
  { href: "/wordbooks", label: "단어장" },
  { href: "/wordbooks/market", label: "마켓" },
  { href: "/offline", label: "오프라인" },
  { href: "/pricing", label: "요금제" }
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
              로그인
            </Link>
          ) : null}
          {isLoggedIn ? (
            <Link href="/logout" className="ui-btn-ghost px-3 py-2 text-sm">
              로그아웃
            </Link>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
