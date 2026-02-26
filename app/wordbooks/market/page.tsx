import Link from "next/link";
import { cookies } from "next/headers";

import { DownloadButton } from "@/components/wordbooks/DownloadButton";
import { MarketRatingReviews } from "@/components/wordbooks/MarketRatingReviews";
import { EmptyStateCard } from "@/components/ui/EmptyStateCard";
import { getUserFromRequestCookies } from "@/lib/authServer";
import { FREE_DOWNLOAD_WORD_LIMIT, getUserDownloadedWordCount } from "@/lib/planLimits";
import { prisma } from "@/lib/prisma";
import { MARKET_MIN_ITEM_COUNT, shouldHideWordbookFromMarket } from "@/lib/wordbookPolicy";
import { maskEmailAddress } from "@/lib/textQuality";
import { deriveWordbookBadges, splitWordbookDescription } from "@/lib/wordbookPresentation";

type SortMode = "top" | "new" | "downloads";
type SizeMode = "all" | "100-300" | "301-700" | "701+";

function parseSort(raw: string | undefined): SortMode {
  if (raw === "new" || raw === "downloads" || raw === "top") return raw;
  return "top";
}

function parseSize(raw: string | undefined): SizeMode {
  if (raw === "100-300" || raw === "301-700" || raw === "701+" || raw === "all") return raw;
  return "all";
}

function matchesSize(itemCount: number, size: SizeMode): boolean {
  if (size === "100-300") return itemCount >= 100 && itemCount <= 300;
  if (size === "301-700") return itemCount >= 301 && itemCount <= 700;
  if (size === "701+") return itemCount >= 701;
  return true;
}

export default async function MarketPage(props: {
  searchParams: Promise<{ q?: string; sort?: string; size?: string; scope?: string; page?: string }>;
}) {
  const user = await getUserFromRequestCookies(await cookies());

  const sp = await props.searchParams;
  const q = (sp.q ?? "").trim();
  const sort = parseSort(sp.sort);
  // Backward compatibility: support legacy `scope` query alias used by older shared links.
  const size = parseSize(sp.size ?? sp.scope);
  const requestedPage = Math.max(Number(sp.page ?? "0") || 0, 0);
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
            { description: { contains: q, mode: "insensitive" as const } },
            { owner: { email: { contains: q, mode: "insensitive" as const } } }
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
        matchesSize(wb._count.items, size) &&
        !shouldHideWordbookFromMarket({
          title: wb.title,
          description: wb.description,
          ownerEmail: wb.owner.email,
          itemCount: wb._count.items
        })
    )
    .map((wb) => wb.id);
  const total = eligibleIds.length;
  const maxPage = Math.max(Math.ceil(total / take) - 1, 0);
  const page = Math.min(requestedPage, maxPage);
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
  const beginnerPicks =
    page === 0
      ? wordbooks
          .filter((wb) => wb._count.items >= 100 && wb._count.items <= 400)
          .slice(0, 3)
      : [];
  const prevPage = Math.max(page - 1, 0);
  const nextPage = Math.min(page + 1, maxPage);
  const prevDisabled = page <= 0;
  const nextDisabled = page >= maxPage;
  const hasActiveFilters = q.length > 0 || sort !== "top" || size !== "all";
  const sortLabel = sort === "new" ? "최신순" : sort === "downloads" ? "다운로드순" : "인기순";
  const sizeLabel = size === "100-300" ? "100~300단어" : size === "301-700" ? "301~700단어" : size === "701+" ? "701단어 이상" : "전체";
  const pagerQuery = { q, sort, size };
  const currentMarketParams = new URLSearchParams();
  if (sp.q !== undefined) currentMarketParams.set("q", sp.q);
  if (sp.sort !== undefined) currentMarketParams.set("sort", sp.sort);
  if (sp.size !== undefined) currentMarketParams.set("size", sp.size);
  if (sp.scope !== undefined) currentMarketParams.set("scope", sp.scope);
  if (sp.page !== undefined) currentMarketParams.set("page", sp.page);
  const marketNextPath = currentMarketParams.size > 0
    ? `/wordbooks/market?${currentMarketParams.toString()}`
    : "/wordbooks/market";
  const marketLoginHref = { pathname: "/login", query: { next: marketNextPath } };
  const marketLoginHrefAsString = `/login?next=${encodeURIComponent(marketNextPath)}`;

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
              게스트 미리보기 모드 - 다운로드와 학습은 <Link href={marketLoginHref} className="font-semibold text-blue-700 hover:underline">로그인</Link> 후 가능합니다.
            </p>
          )}
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          {user ? (
            <Link href={{ pathname: "/wordbooks" }} className="ui-btn-secondary px-4 py-2 text-sm">
              내 단어장
            </Link>
          ) : (
            <Link href={marketLoginHref} className="ui-btn-secondary px-4 py-2 text-sm">
              로그인
            </Link>
          )}
        </div>
      </header>

      <form className="ui-card p-4" method="get">
        <input type="hidden" name="page" value="0" />
        <div className="grid gap-3 md:grid-cols-12 md:items-end">
          <div className="block md:col-span-7">
            <label htmlFor="market-search-q" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
              검색
            </label>
            <input
              id="market-search-q"
              name="q"
              defaultValue={q}
              placeholder="제목, 설명, 제작자 이메일"
              aria-describedby="market-search-help"
              autoComplete="off"
              maxLength={120}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <span id="market-search-help" className="mt-1 block text-[11px] text-slate-500">
              제목/설명/제작자 이메일로 검색할 수 있습니다.
            </span>
          </div>
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
          <label className="block md:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">규모</span>
            <select
              name="size"
              defaultValue={size}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">전체</option>
              <option value="100-300">100~300단어</option>
              <option value="301-700">301~700단어</option>
              <option value="701+">701단어 이상</option>
            </select>
          </label>
          <div className="md:col-span-12 lg:col-span-12">
            <button type="submit" className="ui-btn-primary w-full px-4 py-2 text-sm" aria-label="마켓 필터 적용">
              적용
            </button>
            {hasActiveFilters ? (
              <Link
                href={{ pathname: "/wordbooks/market", query: { sort: "top", size: "all", page: "0" } }}
                className="mt-2 inline-flex text-xs font-semibold text-blue-700 hover:underline"
              >
                필터 초기화
              </Link>
            ) : null}
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500" aria-live="polite">
          검색어: {q ? `"${q}"` : "없음"} · 정렬: {sortLabel} · 규모: {sizeLabel}
        </p>
      </form>

      <div className="flex items-center justify-between text-sm text-slate-600">
        <p aria-live="polite" aria-atomic="true">
          총 {total}개 - {page + 1}/{maxPage + 1}페이지
        </p>
        <nav aria-label="마켓 페이지네이션 (상단)" className="flex items-center gap-2">
          {prevDisabled ? (
            <span className="ui-btn-secondary cursor-not-allowed px-3 py-1.5 text-sm opacity-50" aria-disabled="true">
              이전
            </span>
          ) : (
            <Link
              href={{ pathname: "/wordbooks/market", query: { ...pagerQuery, page: String(prevPage) } }}
              className="ui-btn-secondary px-3 py-1.5 text-sm"
              aria-label="이전 페이지"
            >
              이전
            </Link>
          )}
          {nextDisabled ? (
            <span className="ui-btn-secondary cursor-not-allowed px-3 py-1.5 text-sm opacity-50" aria-disabled="true">
              다음
            </span>
          ) : (
            <Link
              href={{ pathname: "/wordbooks/market", query: { ...pagerQuery, page: String(nextPage) } }}
              className="ui-btn-secondary px-3 py-1.5 text-sm"
              aria-label="다음 페이지"
            >
              다음
            </Link>
          )}
        </nav>
      </div>

      {beginnerPicks.length > 0 ? (
        <div className="ui-card p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">초보 추천</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {beginnerPicks.map((wb) => (
              <Link
                key={`pick-${wb.id}`}
                href={{ pathname: `/wordbooks/${wb.id}` }}
                className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800 hover:bg-blue-100"
              >
                {wb.title}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {wordbooks.length === 0 ? (
        <EmptyStateCard
          title="검색 결과가 없습니다"
          description="검색어를 줄이거나 정렬 기준을 바꿔서 다시 찾아보세요."
          primary={{ label: "필터 초기화", href: "/wordbooks/market?sort=top&size=all&page=0" }}
          secondary={{ label: user ? "내 단어장" : "로그인", href: user ? "/wordbooks" : marketLoginHrefAsString }}
        />
      ) : (
        <>
          <p className="text-xs text-slate-500">
            신고는 관리자 검토 후 처리되며, 제작자 차단은 개인화 기능입니다.
          </p>
          <div className="grid gap-3 md:grid-cols-2" role="list" aria-label="마켓 단어장 목록">
            {wordbooks.map((wb) => {
            const isDownloaded = downloadedIds.has(wb.id);
            const description = splitWordbookDescription(wb.description).displayDescription;
            return (
              <div key={wb.id} className="ui-card p-4 transition hover:-translate-y-0.5" role="listitem">
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
                    <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                      {description ?? `${wb._count.items}개 단어 · ${wb.fromLang}에서 ${wb.toLang}로 학습하는 기본 단어장입니다.`}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                      <span>{wb._count.items}개 단어</span>
                      <span>{wb.downloadCount}회 다운로드</span>
                      <span>
                        {wb.fromLang}
                        {" → "}
                        {wb.toLang}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {deriveWordbookBadges({
                        itemCount: wb._count.items,
                        ratingAvg: wb.ratingAvg,
                        ratingCount: wb.ratingCount,
                        downloadCount: wb.downloadCount,
                        createdAt: wb.createdAt,
                        hasDescription: !!description,
                        isRecommended: sort === "top" && page === 0
                      }).slice(0, 2).map((badge) => (
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
                        href={marketLoginHref}
                        className="ui-btn-secondary rounded-xl px-3 py-2 text-xs"
                      >
                        로그인 후 다운로드
                      </Link>
                    ) : null}
                    {user && wb.owner.id !== user.id ? (
                      <p className="mt-2 text-[11px] text-slate-500">
                        신고/차단은 상세 페이지에서 가능합니다.
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            );
            })}
          </div>
        </>
      )}

      {total > 0 ? (
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 md:hidden">
        <div className="mx-auto w-full max-w-5xl px-6">
          <nav aria-label="마켓 페이지네이션 (모바일 하단)" className="pointer-events-auto ui-card flex items-center justify-between gap-2 p-2">
            {prevDisabled ? (
              <span className="ui-btn-secondary cursor-not-allowed px-4 py-2 text-sm opacity-50" aria-disabled="true">
                이전
              </span>
            ) : (
              <Link
                href={{ pathname: "/wordbooks/market", query: { ...pagerQuery, page: String(prevPage) } }}
                className="ui-btn-secondary px-4 py-2 text-sm"
                aria-label={`${prevPage + 1}페이지로 이동`}
              >
                이전
              </Link>
            )}
            <p className="text-xs font-semibold text-slate-600">
              {page + 1}/{maxPage + 1}
            </p>
            {nextDisabled ? (
              <span className="ui-btn-secondary cursor-not-allowed px-4 py-2 text-sm opacity-50" aria-disabled="true">
                다음
              </span>
            ) : (
              <Link
                href={{ pathname: "/wordbooks/market", query: { ...pagerQuery, page: String(nextPage) } }}
                className="ui-btn-secondary px-4 py-2 text-sm"
                aria-label={`${nextPage + 1}페이지로 이동`}
              >
                다음
              </Link>
            )}
          </nav>
        </div>
      </div>
      ) : null}
    </section>
  );
}


