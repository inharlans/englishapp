import Link from "next/link";
import type { Route } from "next";

type Props = {
  title: string;
  description: string;
  primary: { label: string; href: string };
  secondary?: { label: string; href: string };
};

export function EmptyStateCard({ title, description, primary, secondary }: Props) {
  return (
    <div className="ui-empty">
      <p className="ui-kicker">비어 있음</p>
      <h3 className="mt-2 text-lg font-black text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-600">{description}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href={primary.href as Route} className="ui-btn-primary px-3 py-1.5 text-xs">
          {primary.label}
        </Link>
        {secondary ? (
          <Link href={secondary.href as Route} className="ui-btn-secondary px-3 py-1.5 text-xs">
            {secondary.label}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
