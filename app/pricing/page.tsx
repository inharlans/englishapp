import Link from "next/link";
import { cookies } from "next/headers";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { prisma } from "@/lib/prisma";

export default async function PricingPage() {
  const user = await getUserFromRequestCookies(await cookies());

  const downloadsUsed = user
    ? await prisma.wordbookDownload.count({ where: { userId: user.id } })
    : null;

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Pricing</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
            Free vs PRO
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            PRO removes download limits and unlocks private wordbooks.
          </p>
          {user ? (
            <p className="mt-1 text-xs text-slate-500">
              You are on <span className="font-semibold">{user.plan}</span>
              {user.plan === "FREE" && typeof downloadsUsed === "number" ? (
                <>
                  {" "}
                  - downloads used: <span className="font-semibold">{downloadsUsed}/3</span>
                </>
              ) : null}
            </p>
          ) : (
            <p className="mt-1 text-xs text-slate-500">Login to see your usage.</p>
          )}
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <Link
            href={{ pathname: "/wordbooks" }}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            My Library
          </Link>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.25)]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">FREE</p>
          <p className="mt-2 text-3xl font-black text-slate-900">0 KRW</p>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            <li>Download: 3 lifetime</li>
            <li>Uploads: forced public</li>
            <li>Offline save for downloaded wordbooks</li>
          </ul>
        </div>

        <div className="rounded-3xl border border-teal-200 bg-gradient-to-b from-teal-50 to-white p-6 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.25)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">PRO</p>
              <p className="mt-2 text-3xl font-black text-slate-900">2,900 KRW / month</p>
              <p className="mt-1 text-sm font-semibold text-slate-700">29,000 KRW / year</p>
            </div>
            <span className="rounded-full border border-teal-200 bg-white px-3 py-1 text-xs font-semibold text-teal-800">
              Recommended
            </span>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            <li>Download: unlimited</li>
            <li>Uploads: public or private (your choice)</li>
            <li>Offline-first workflow</li>
          </ul>
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
            Payment is not wired yet. For now, an admin can upgrade your account from{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5">/admin</code>.
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
        If you hit the FREE download limit, upgrade to PRO to keep downloading.
      </div>
    </section>
  );
}

