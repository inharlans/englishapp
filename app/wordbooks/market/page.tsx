import Link from "next/link";
import { cookies } from "next/headers";

import { DownloadButton } from "@/components/wordbooks/DownloadButton";
import { StarRating } from "@/components/wordbooks/StarRating";
import { getUserFromRequestCookies } from "@/lib/authServer";
import { prisma } from "@/lib/prisma";

type SortMode = "top" | "new" | "downloads";

function parseSort(raw: string | undefined): SortMode {
  if (raw === "new" || raw === "downloads" || raw === "top") return raw;
  return "top";
}

export default async function MarketPage(props: {
  searchParams: Promise<{ q?: string; sort?: string; page?: string }>;
}) {
  const user = await getUserFromRequestCookies(await cookies());
  if (!user) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">Market</h1>
        <p className="text-sm text-slate-600">Login required.</p>
      </section>
    );
  }

  const sp = await props.searchParams;
  const q = (sp.q ?? "").trim();
  const sort = parseSort(sp.sort);
  const page = Math.max(Number(sp.page ?? "0") || 0, 0);
  const take = 30;

  const where = {
    isPublic: true,
    hiddenByAdmin: false,
    ownerId: {
      notIn: (
        await prisma.blockedOwner.findMany({
          where: { userId: user.id },
          select: { ownerId: true }
        })
      ).map((b) => b.ownerId)
    },
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { description: { contains: q, mode: "insensitive" as const } }
          ]
        }
      : {})
  };

  const orderBy =
    sort === "new"
      ? [{ createdAt: "desc" as const }]
      : sort === "downloads"
        ? [{ downloadCount: "desc" as const }, { ratingAvg: "desc" as const }]
        : [{ rankScore: "desc" as const }, { createdAt: "desc" as const }];

  const [total, wordbooks, myDownloads, myDownloadsUsed] = await Promise.all([
    prisma.wordbook.count({ where }),
    prisma.wordbook.findMany({
      where,
      orderBy,
      skip: page * take,
      take,
      select: {
        id: true,
        title: true,
        description: true,
        fromLang: true,
        toLang: true,
        downloadCount: true,
        ratingAvg: true,
        ratingCount: true,
        createdAt: true,
        owner: { select: { email: true } },
        _count: { select: { items: true } }
      }
    }),
    prisma.wordbookDownload.findMany({
      where: { userId: user.id },
      select: { wordbookId: true }
    }),
    prisma.wordbookDownload.count({
      where: { userId: user.id }
    })
  ]);

  const downloadedIds = new Set(myDownloads.map((d) => d.wordbookId));
  const maxPage = Math.max(Math.ceil(total / take) - 1, 0);

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Wordbooks
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Market</h1>
          <p className="mt-2 text-sm text-slate-600">
            Browse public wordbooks. Downloaded copies are read-only.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Plan: <span className="font-semibold">{user.plan}</span>
            {user.plan === "FREE" ? (
              <>
                {" "}- downloads used: <span className="font-semibold">{myDownloadsUsed}/3</span>{" "}
                -{" "}
                <Link
                  href={{ pathname: "/pricing" }}
                  className="font-semibold text-teal-700 hover:underline"
                >
                  upgrade
                </Link>
              </>
            ) : null}
          </p>
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

      <form className="rounded-2xl border border-slate-200 bg-white p-4" method="get">
        <div className="grid gap-3 md:grid-cols-12 md:items-end">
          <label className="block md:col-span-7">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
              Search
            </span>
            <input
              name="q"
              defaultValue={q}
              placeholder="title or description"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
          </label>
          <label className="block md:col-span-3">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
              Sort
            </span>
            <select
              name="sort"
              defaultValue={sort}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            >
              <option value="top">Top</option>
              <option value="new">New</option>
              <option value="downloads">Downloads</option>
            </select>
          </label>
          <div className="md:col-span-2">
            <button
              type="submit"
              className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Apply
            </button>
          </div>
        </div>
      </form>

      <div className="flex items-center justify-between text-sm text-slate-600">
        <p>
          {total} results - page {page + 1}/{maxPage + 1}
        </p>
        <div className="flex items-center gap-2">
          <Link
            href={{
              pathname: "/wordbooks/market",
              query: { q, sort, page: String(Math.max(page - 1, 0)) }
            }}
            className={[
              "rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-slate-50",
              page <= 0 ? "pointer-events-none opacity-50" : ""
            ].join(" ")}
          >
            Prev
          </Link>
          <Link
            href={{
              pathname: "/wordbooks/market",
              query: { q, sort, page: String(Math.min(page + 1, maxPage)) }
            }}
            className={[
              "rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-slate-50",
              page >= maxPage ? "pointer-events-none opacity-50" : ""
            ].join(" ")}
          >
            Next
          </Link>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {wordbooks.map((wb) => {
          const isDownloaded = downloadedIds.has(wb.id);
          return (
            <div
              key={wb.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_14px_34px_-24px_rgba(15,23,42,0.55)]"
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={{ pathname: `/wordbooks/${wb.id}` }}
                      className="truncate text-lg font-black text-slate-900 hover:underline"
                    >
                      {wb.title}
                    </Link>
                    {isDownloaded ? (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                        Downloaded
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">by {wb.owner.email}</p>
                  {wb.description ? (
                    <p className="mt-2 line-clamp-2 text-sm text-slate-600">{wb.description}</p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                    <span>{wb._count.items} items</span>
                    <span>{wb.downloadCount} downloads</span>
                    <span>
                      {wb.fromLang} → {wb.toLang}
                    </span>
                  </div>
                  <div className="mt-2">
                    <StarRating value={wb.ratingAvg} count={wb.ratingCount} />
                  </div>
                </div>
                <div className="shrink-0">
                  {!isDownloaded ? (
                    <DownloadButton
                      wordbookId={wb.id}
                      disabled={user.plan === "FREE" && myDownloadsUsed >= 3}
                    />
                  ) : null}
                  {!isDownloaded && user.plan === "FREE" && myDownloadsUsed >= 3 ? (
                    <p className="mt-1 text-[11px] font-semibold text-amber-700">
                      Limit reached -{" "}
                      <Link
                        href={{ pathname: "/pricing" }}
                        className="text-teal-700 hover:underline"
                      >
                        upgrade
                      </Link>
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
