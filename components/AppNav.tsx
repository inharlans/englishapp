"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const links: Array<{ href: string; label: string }> = [
  { href: "/", label: "홈" },
  { href: "/wordbooks", label: "단어장" },
  { href: "/wordbooks/market", label: "마켓" },
  { href: "/clipper/extension", label: "클리퍼 설치" },
  { href: "/offline", label: "오프라인" },
  { href: "/pricing", label: "요금제" }
];

function normalizeNextPath(raw: string | null): string {
  if (!raw) return "/wordbooks";
  if (!raw.startsWith("/")) return "/wordbooks";
  if (raw.startsWith("//")) return "/wordbooks";
  return raw;
}

export function AppNav({ isLoggedIn }: { isLoggedIn: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qs = searchParams.toString();
  const pathWithQuery = pathname ? `${pathname}${qs ? `?${qs}` : ""}` : "/wordbooks";
  const loginNextPath = normalizeNextPath(searchParams.get("next"));
  const nextPath = pathname === "/login" ? loginNextPath : pathWithQuery;
  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href === "/wordbooks") {
      return pathname === "/wordbooks" || /^\/wordbooks\/\d+/.test(pathname);
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <nav aria-label="주요 메뉴" className="ui-card-soft mb-6 p-4">
      <ul className="flex flex-wrap items-center gap-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={{ pathname: link.href }}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={[
                "px-3 py-2 text-sm",
                isActive(link.href) ? "ui-btn-primary" : "ui-btn-secondary"
              ].join(" ")}
            >
              {link.label}
            </Link>
          </li>
        ))}
        <li className="ml-auto">
          <div className="flex items-center gap-2" role="group" aria-label="계정 메뉴">
          {!isLoggedIn ? (
            <Link href={{ pathname: "/login", query: { next: nextPath } }} className="ui-btn-secondary px-3 py-2 text-sm">
              로그인
            </Link>
          ) : null}
          {isLoggedIn ? (
            <Link href="/logout" className="ui-btn-ghost px-3 py-2 text-sm" aria-label="계정 로그아웃">
              로그아웃
            </Link>
          ) : null}
          </div>
        </li>
      </ul>
    </nav>
  );
}
