"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const links: Array<{ href: string; label: string }> = [
  { href: "/", label: "홈" },
  { href: "/wordbooks", label: "단어장" },
  { href: "/wordbooks/market", label: "마켓" },
  { href: "/clipper/extension", label: "확장자 설치" },
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
    <nav
      aria-label="주요 메뉴"
      className="mb-6 rounded-2xl border border-slate-200/80 bg-white/85 p-3 shadow-sm backdrop-blur"
    >
      <ul className="flex flex-wrap items-center gap-1.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={{ pathname: link.href }}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={[
                "inline-flex items-center rounded-full px-3 py-2 text-sm font-medium transition-colors",
                isActive(link.href)
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              ].join(" ")}
            >
              {link.label}
            </Link>
          </li>
        ))}
        <li className="ml-auto">
          <div className="flex items-center gap-2" role="group" aria-label="계정 메뉴">
            {!isLoggedIn ? (
              <Link
                href={{ pathname: "/login", query: { next: nextPath } }}
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
              >
                로그인
              </Link>
            ) : null}
            {isLoggedIn ? (
              <Link
                href="/logout"
                className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
                aria-label="계정 로그아웃"
              >
                로그아웃
              </Link>
            ) : null}
          </div>
        </li>
      </ul>
    </nav>
  );
}
