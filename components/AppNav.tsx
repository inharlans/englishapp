import type { Route } from "next";
import Link from "next/link";

const links: Array<{ href: Route; label: string }> = [
  { href: "/", label: "Home" },
  { href: "/memorize", label: "Memorize" },
  { href: "/quiz-meaning", label: "Quiz Meaning" },
  { href: "/quiz-word", label: "Quiz Word" },
  { href: "/list-correct", label: "Correct List" },
  { href: "/list-wrong", label: "Wrong List" },
  { href: "/list-half", label: "Half List" }
];

export function AppNav() {
  return (
    <nav className="mb-6 rounded-xl bg-white p-4 shadow-sm">
      <div className="flex flex-wrap gap-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

