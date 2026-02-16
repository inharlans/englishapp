import Link from "next/link";
import { cookies } from "next/headers";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { prisma } from "@/lib/prisma";
import { StarRating } from "@/components/wordbooks/StarRating";
import { OfflineSaveButton } from "@/components/wordbooks/OfflineSaveButton";

export default async function WordbooksPage() {
  const user = await getUserFromRequestCookies(await cookies());
  if (!user) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">Wordbooks</h1>
        <p className="text-sm text-slate-600">Login required.</p>
      </section>
    );
  }

  const [mine, downloaded, downloadsUsed] = await Promise.all([
    prisma.wordbook.findMany({
      where: { ownerId: user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        isPublic: true,
        downloadCount: true,
        ratingAvg: true,
        ratingCount: true,
        updatedAt: true,
        _count: { select: { items: true } }
      }
    }),
    prisma.wordbookDownload.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        wordbook: {
          select: {
            id: true,
            title: true,
            description: true,
            isPublic: true,
            downloadCount: true,
            ratingAvg: true,
            ratingCount: true,
            owner: { select: { email: true } },
            updatedAt: true,
            _count: { select: { items: true } }
          }
        }
      }
    }),
    prisma.wordbookDownload.count({
      where: { userId: user.id }
    })
  ]);

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Wordbooks
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">My Library</h1>
          <p className="mt-2 text-sm text-slate-600">
            Create your own wordbooks or download public ones.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Plan: <span className="font-semibold">{user.plan}</span>
            {user.plan === "FREE" ? (
              <>
                {" "}
                - downloads used: <span className="font-semibold">{downloadsUsed}/3</span> - free
                uploads are forced public -{" "}
                <Link
                  href={{ pathname: "/pricing" }}
                  className="font-semibold text-teal-700 hover:underline"
                >
                  upgrade
                </Link>
              </>
            ) : null}
            {user.isAdmin ? (
              <>
                {" "}
                -{" "}
                <Link
                  href={{ pathname: "/admin" }}
                  className="font-semibold text-teal-700 hover:underline"
                >
                  admin
                </Link>
              </>
            ) : null}
          </p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <Link
            href={{ pathname: "/wordbooks/new" }}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            New
          </Link>
          <Link
            href={{ pathname: "/wordbooks/market" }}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            Market
          </Link>
          <Link
            href={{ pathname: "/offline" }}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            Offline
          </Link>
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-700">
          Created
        </h2>
        {mine.length === 0 ? (
          <p className="text-sm text-slate-600">No wordbooks yet.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {mine.map((wb) => (
              <Link
                key={wb.id}
                href={{ pathname: `/wordbooks/${wb.id}` }}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_14px_34px_-24px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 hover:border-teal-300"
              >
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-lg font-black text-slate-900">{wb.title}</h3>
                      <span
                        className={[
                          "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                          wb.isPublic
                            ? "border border-teal-200 bg-teal-50 text-teal-800"
                            : "border border-slate-200 bg-slate-50 text-slate-700"
                        ].join(" ")}
                      >
                        {wb.isPublic ? "Public" : "Private"}
                      </span>
                    </div>
                    {wb.description ? (
                      <p className="mt-1 line-clamp-2 text-sm text-slate-600">{wb.description}</p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                      <span>{wb._count.items} items</span>
                      <span>{wb.downloadCount} downloads</span>
                    </div>
                    <div className="mt-2">
                      <StarRating value={wb.ratingAvg} count={wb.ratingCount} />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-700">
          Downloaded (Read-only)
        </h2>
        {downloaded.length === 0 ? (
          <p className="text-sm text-slate-600">No downloads yet.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {downloaded.map((d) => (
              <div
                key={d.wordbook.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_14px_34px_-24px_rgba(15,23,42,0.55)]"
              >
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={{ pathname: `/wordbooks/${d.wordbook.id}` }}
                        className="truncate text-lg font-black text-slate-900 hover:underline"
                      >
                        {d.wordbook.title}
                      </Link>
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                        Downloaded
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      by {d.wordbook.owner.email} - downloaded{" "}
                      {d.createdAt.toISOString().slice(0, 10)}
                    </p>
                    {d.wordbook.description ? (
                      <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                        {d.wordbook.description}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                      <span>{d.wordbook._count.items} items</span>
                      <span>{d.wordbook.downloadCount} downloads</span>
                    </div>
                    <div className="mt-2">
                      <StarRating value={d.wordbook.ratingAvg} count={d.wordbook.ratingCount} />
                    </div>
                    <div className="mt-3">
                      <OfflineSaveButton wordbookId={d.wordbook.id} />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Link
                        href={{ pathname: `/wordbooks/${d.wordbook.id}/study` }}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-slate-50"
                      >
                        Study State
                      </Link>
                      <Link
                        href={{ pathname: `/wordbooks/${d.wordbook.id}/quiz` }}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-slate-50"
                      >
                        Quiz
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
