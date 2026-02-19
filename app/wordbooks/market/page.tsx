import Link from "next/link";
import { cookies } from "next/headers";

import { DownloadButton } from "@/components/wordbooks/DownloadButton";
import { BlockOwnerButton } from "@/components/wordbooks/BlockOwnerButton";
import { MarketRatingReviews } from "@/components/wordbooks/MarketRatingReviews";
import { EmptyStateCard } from "@/components/ui/EmptyStateCard";
import { getUserFromRequestCookies } from "@/lib/authServer";
import { FREE_DOWNLOAD_WORD_LIMIT, getUserDownloadedWordCount } from "@/lib/planLimits";
import { prisma } from "@/lib/prisma";
import { MARKET_MIN_ITEM_COUNT, shouldHideWordbookFromMarket } from "@/lib/wordbookPolicy";
import { maskEmailAddress } from "@/lib/textQuality";
import { deriveWordbookBadges, splitWordbookDescription } from "@/lib/wordbookPresentation";

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

  const candidates = await prisma.wordbook.findMany({
    where,
    orderBy,
    select: {
      id: true,
      title: true,
      description: true,
      owner: { select: { email: true } },
      _count: { select: { items: true } }
    }
  });
  const eligibleIds = candidates
    .filter(
      (wb) =>
        !shouldHideWordbookFromMarket({
          title: wb.title,
          description: wb.description,
          ownerEmail: wb.owner.email,
          itemCount: wb._count.items
        })
    )
    .map((wb) => wb.id);
  const total = eligibleIds.length;
  const pageIds = eligibleIds.slice(page * take, page * take + take);

  const [wordbooksUnordered, myDownloads, myDownloadedWordCount] = await Promise.all([
    pageIds.length > 0
      ? prisma.wordbook.findMany({
          where: { id: { in: pageIds } },
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
        })
      : Promise.resolve([]),
    user
      ? prisma.wordbookDownload.findMany({
          where: { userId: user.id },
          select: { wordbookId: true }
        })
      : Promise.resolve([]),
    user ? getUserDownloadedWordCount(user.id) : Promise.resolve(0)
  ]);
  const byId = new Map(wordbooksUnordered.map((wb) => [wb.id, wb] as const));
  const wordbooks = pageIds
    .map((id) => byId.get(id))
    .filter((wb): wb is NonNullable<typeof wb> => wb !== undefined);

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
          <p className="ui-kicker">단어장</p>
          <h1 className="ui-h2 mt-2">마켓</h1>
          <p className="ui-body mt-2">공개 단어장을 둘러보세요. 다운로드본은 읽기 전용입니다.</p>
          <p className="mt-1 text-xs text-slate-500">{MARKET_MIN_ITEM_COUNT}단어 이상 단어장만 마켓에 노출됩니다.</p>
          {user ? (
            <p className="mt-1 text-xs text-slate-500">
              요금제: <span className="font-semibold">{user.plan}</span>
              {user.plan === "FREE" ? (
                <>
                  {" "}
                  - 다운로드 사용량: <span className="font-semibold">{myDownloadedWordCount}/{FREE_DOWNLOAD_WORD_LIMIT}단어</span> -{" "}
                  <Link
                    href={{ pathname: "/pricing" }}
                    className="font-semibold text-blue-700 hover:underline"
                  >
                    업그레이드
                  </Link>
                </>
              ) : null}
            </p>
          ) : (
            <p className="mt-1 text-xs text-slate-500">
              게스트 미리보기 모드 - 다운로드와 학습은 <Link href={{ pathname: "/login" }} className="font-semibold text-blue-700 hover:underline">로그인</Link> 후 가능합니다.
            </p>
          )}
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          {user ? (
            <Link href={{ pathname: "/wordbooks" }} className="ui-btn-secondary px-4 py-2 text-sm">
              내 단어장
            </Link>
          ) : (
            <Link href={{ pathname: "/login", query: { next: "/wordbooks" } }} className="ui-btn-secondary px-4 py-2 text-sm">
              로그인
            </Link>
          )}
        </div>
      </header>

      <form className="ui-card p-4" method="get">
        <div className="grid gap-3 md:grid-cols-12 md:items-end">
          <label className="block md:col-span-7">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">검색</span>
            <input
              name="q"
              defaultValue={q}
              placeholder="제목 또는 설명"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label className="block md:col-span-3">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">정렬</span>
            <select
              name="sort"
              defaultValue={sort}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="top">인기순</option>
              <option value="new">최신순</option>
              <option value="downloads">다운로드순</option>
            </select>
          </label>
          <div className="md:col-span-2">
            <button type="submit" className="ui-btn-primary w-full px-4 py-2 text-sm">
              적용
            </button>
          </div>
        </div>
      </form>

      <div className="flex items-center justify-between text-sm text-slate-600">
        <p>
          총 {total}개 - {page + 1}/{maxPage + 1}페이지
        </p>
        <div className="flex items-center gap-2">
          <Link
            href={{ pathname: "/wordbooks/market", query: { q, sort, page: String(prevPage) } }}
            className={[
              "ui-btn-secondary px-3 py-1.5 text-sm",
              prevDisabled ? "pointer-events-none opacity-50" : ""
            ].join(" ")}
          >
            이전
          </Link>
          <Link
            href={{ pathname: "/wordbooks/market", query: { q, sort, page: String(nextPage) } }}
            className={[
              "ui-btn-secondary px-3 py-1.5 text-sm",
              nextDisabled ? "pointer-events-none opacity-50" : ""
            ].join(" ")}
          >
            다음
          </Link>
        </div>
      </div>

      {wordbooks.length === 0 ? (
        <EmptyStateCard
          title="검색 결과가 없습니다"
          description="검색어를 줄이거나 정렬 기준을 바꿔서 다시 찾아보세요."
          primary={{ label: "필터 초기화", href: "/wordbooks/market?sort=top&page=0" }}
          secondary={{ label: "내 단어장", href: "/wordbooks" }}
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
                          다운로드됨
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">제작자 {maskEmailAddress(wb.owner.email)}</p>
                    {wb.description ? (
                      <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                        {splitWordbookDescription(wb.description).displayDescription ?? "설명이 없습니다."}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                      <span>{wb._count.items}개 단어</span>
                      <span>{wb.downloadCount}회 다운로드</span>
                      <span>
                        {wb.fromLang}
                        {" -> "}
                        {wb.toLang}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {deriveWordbookBadges({
                        itemCount: wb._count.items,
                        ratingAvg: wb.ratingAvg,
                        ratingCount: wb.ratingCount
                      }).map((badge) => (
                        <span
                          key={badge}
                          className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-800"
                        >
                          {badge}
                        </span>
                      ))}
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
                        disabled={
                          user.plan === "FREE" &&
                          myDownloadedWordCount + wb._count.items > FREE_DOWNLOAD_WORD_LIMIT
                        }
                        className="rounded-2xl px-4 py-2"
                      />
                    ) : null}
                    {!isDownloaded &&
                    user &&
                    user.plan === "FREE" &&
                    myDownloadedWordCount + wb._count.items > FREE_DOWNLOAD_WORD_LIMIT ? (
                      <p className="mt-1 text-[11px] font-semibold text-blue-700">
                        한도 도달 -{" "}
                        <Link href={{ pathname: "/pricing" }} className="text-blue-700 hover:underline">
                          업그레이드
                        </Link>
                      </p>
                    ) : null}
                    {!isDownloaded && !user ? (
                      <Link
                        href={{ pathname: "/login", query: { next: `/wordbooks/${wb.id}` } }}
                        className="ui-btn-secondary rounded-xl px-3 py-2 text-xs"
                      >
                        로그인 후 다운로드
                      </Link>
                    ) : null}
                    {user && wb.owner.id !== user.id ? (
                      <div className="mt-2">
                        <BlockOwnerButton wordbookId={wb.id} />
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
              이전
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
              다음
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

