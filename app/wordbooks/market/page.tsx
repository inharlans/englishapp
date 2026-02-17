import Link from "next/link";
import { cookies } from "next/headers";

import { DownloadButton } from "@/components/wordbooks/DownloadButton";
import { BlockOwnerButton } from "@/components/wordbooks/BlockOwnerButton";
import { MarketRatingReviews } from "@/components/wordbooks/MarketRatingReviews";
import { EmptyStateCard } from "@/components/ui/EmptyStateCard";
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

  const sp = await props.searchParams;
  const q = (sp.q ?? "").trim();
  const sort = parseSort(sp.sort);
  const page = Math.max(Number(sp.page ?? "0") || 0, 0);
  const take = 30;

  const blockedOwnerIds = user
    ? (
        await prisma.blockedOwner.findMany({
          where: { userId: user.id },
          select: { ownerId: true }
        })
      ).map((b) => b.ownerId)
    : [];

  const where = {
    isPublic: true,
    hiddenByAdmin: false,
    ...(blockedOwnerIds.length > 0 ? { ownerId: { notIn: blockedOwnerIds } } : {}),
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
        owner: { select: { id: true, email: true } },
        _count: { select: { items: true } }
      }
    }),
    user
      ? prisma.wordbookDownload.findMany({
          where: { userId: user.id },
          select: { wordbookId: true }
        })
      : Promise.resolve([]),
    user
      ? prisma.wordbookDownload.count({
          where: { userId: user.id }
        })
      : Promise.resolve(0)
  ]);

  const downloadedIds = new Set(myDownloads.map((d) => d.wordbookId));
  const maxPage = Math.max(Math.ceil(total / take) - 1, 0);
  const prevPage = Math.max(page - 1, 0);
  const nextPage = Math.min(page + 1, maxPage);
  const prevDisabled = page <= 0;
  const nextDisabled = page >= maxPage;

  return (
    <section className="space-y-6 pb-24">
      <header className="flex flex-wrap items-end gap-3">
        <div>
          <p className="ui-kicker">Wordbooks</p>
          <h1 className="ui-h2 mt-2">Market</h1>
          <p className="ui-body mt-2">Browse public wordbooks. Downloaded copies are read-only.</p>
          {user ? (
            <p className="mt-1 text-xs text-slate-500">
              Plan: <span className="font-semibold">{user.plan}</span>
              {user.plan === "FREE" ? (
                <>
                  {" "}
                  - downloads used: <span className="font-semibold">{myDownloadsUsed}/3</span> -{" "}
                  <Link
                    href={{ pathname: "/pricing" }}
                    className="font-semibold text-blue-700 hover:underline"
                  >
                    upgrade
                  </Link>
                </>
              ) : null}
            </p>
          ) : (
            <p className="mt-1 text-xs text-slate-500">
              Guest preview mode - <Link href={{ pathname: "/login" }} className="font-semibold text-blue-700 hover:underline">login</Link> to download and study.
            </p>
          )}
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          {user ? (
            <Link href={{ pathname: "/wordbooks" }} className="ui-btn-secondary px-4 py-2 text-sm">
              My Library
            </Link>
          ) : (
            <Link href={{ pathname: "/login", query: { next: "/wordbooks" } }} className="ui-btn-secondary px-4 py-2 text-sm">
              Login
            </Link>
          )}
        </div>
      </header>

      <form className="ui-card p-4" method="get">
        <div className="grid gap-3 md:grid-cols-12 md:items-end">
          <label className="block md:col-span-7">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Search</span>
            <input
              name="q"
              defaultValue={q}
              placeholder="title or description"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label className="block md:col-span-3">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Sort</span>
            <select
              name="sort"
              defaultValue={sort}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="top">Top</option>
              <option value="new">New</option>
              <option value="downloads">Downloads</option>
            </select>
          </label>
          <div className="md:col-span-2">
            <button type="submit" className="ui-btn-primary w-full px-4 py-2 text-sm">
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
            href={{ pathname: "/wordbooks/market", query: { q, sort, page: String(prevPage) } }}
            className={[
              "ui-btn-secondary px-3 py-1.5 text-sm",
              prevDisabled ? "pointer-events-none opacity-50" : ""
            ].join(" ")}
          >
            Prev
          </Link>
          <Link
            href={{ pathname: "/wordbooks/market", query: { q, sort, page: String(nextPage) } }}
            className={[
              "ui-btn-secondary px-3 py-1.5 text-sm",
              nextDisabled ? "pointer-events-none opacity-50" : ""
            ].join(" ")}
          >
            Next
          </Link>
        </div>
      </div>

      {wordbooks.length === 0 ? (
        <EmptyStateCard
          title="No results found"
          description="Try a shorter query or change sorting to discover more wordbooks."
          primary={{ label: "Reset filters", href: "/wordbooks/market?sort=top&page=0" }}
          secondary={{ label: "My library", href: "/wordbooks" }}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {wordbooks.map((wb) => {
            const isDownloaded = downloadedIds.has(wb.id);
            return (
              <div key={wb.id} className="ui-card p-4 transition hover:-translate-y-0.5">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={{ pathname: `/wordbooks/${wb.id}` }} className="truncate text-lg font-black text-slate-900 hover:underline">
                        {wb.title}
                      </Link>
                      {isDownloaded ? (
                        <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-800">
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
                        {wb.fromLang}
                        {" -> "}
                        {wb.toLang}
                      </span>
                    </div>
                    <div className="mt-2">
                      <MarketRatingReviews wordbookId={wb.id} ratingAvg={wb.ratingAvg} ratingCount={wb.ratingCount} />
                    </div>
                  </div>
                  <div className="shrink-0">
                    {!isDownloaded && user ? (
                      <DownloadButton
                        wordbookId={wb.id}
                        wordbookTitle={wb.title}
                        disabled={user.plan === "FREE" && myDownloadsUsed >= 3}
                        className="rounded-2xl px-4 py-2"
                      />
                    ) : null}
                    {!isDownloaded && user && user.plan === "FREE" && myDownloadsUsed >= 3 ? (
                      <p className="mt-1 text-[11px] font-semibold text-blue-700">
                        Limit reached -{" "}
                        <Link href={{ pathname: "/pricing" }} className="text-blue-700 hover:underline">
                          upgrade
                        </Link>
                      </p>
                    ) : null}
                    {!isDownloaded && !user ? (
                      <Link
                        href={{ pathname: "/login", query: { next: `/wordbooks/${wb.id}` } }}
                        className="ui-btn-secondary rounded-xl px-3 py-2 text-xs"
                      >
                        Login to download
                      </Link>
                    ) : null}
                    {user && wb.owner.id !== user.id ? (
                      <div className="mt-2">
                        <BlockOwnerButton wordbookId={wb.id} ownerEmail={wb.owner.email} />
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40">
        <div className="mx-auto w-full max-w-5xl px-6">
          <div className="pointer-events-auto ui-card flex items-center justify-between gap-2 p-2">
            <Link
              href={{ pathname: "/wordbooks/market", query: { q, sort, page: String(prevPage) } }}
              className={[
                "ui-btn-secondary px-4 py-2 text-sm",
                prevDisabled ? "pointer-events-none opacity-50" : ""
              ].join(" ")}
            >
              Prev
            </Link>
            <p className="text-xs font-semibold text-slate-600">
              {page + 1}/{maxPage + 1}
            </p>
            <Link
              href={{ pathname: "/wordbooks/market", query: { q, sort, page: String(nextPage) } }}
              className={[
                "ui-btn-secondary px-4 py-2 text-sm",
                nextDisabled ? "pointer-events-none opacity-50" : ""
              ].join(" ")}
            >
              Next
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

