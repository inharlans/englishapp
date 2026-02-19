import Link from "next/link";
import { cookies } from "next/headers";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { prisma } from "@/lib/prisma";
import { LastResult } from "@prisma/client";
import { StarRating } from "@/components/wordbooks/StarRating";
import { OfflineSaveButton } from "@/components/wordbooks/OfflineSaveButton";
import { SyncDownloadButton } from "@/components/wordbooks/SyncDownloadButton";
import { PostDownloadOnboardingBanner } from "@/components/wordbooks/PostDownloadOnboardingBanner";
import { LearningDashboardHeader } from "@/components/wordbooks/LearningDashboardHeader";
import { FREE_DOWNLOAD_WORD_LIMIT, getUserDownloadedWordCount } from "@/lib/planLimits";
import { aggregateVersionLogs } from "@/lib/wordbookVersion";
import { EmptyStateCard } from "@/components/ui/EmptyStateCard";
import { splitWordbookDescription } from "@/lib/wordbookPresentation";
import { maskEmailAddress } from "@/lib/textQuality";

export default async function WordbooksPage() {
  const reqCookies = await cookies();
  const user = await getUserFromRequestCookies(reqCookies);
  if (!user) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">단어장</h1>
        <p className="text-sm text-slate-600">로그인이 필요합니다.</p>
      </section>
    );
  }

  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const [mine, downloaded, downloadedWordCount, todayCorrect] = await Promise.all([
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
        downloadedVersion: true,
        snapshotItemCount: true,
        syncedAt: true,
        wordbook: {
          select: {
            id: true,
            title: true,
            description: true,
            isPublic: true,
            downloadCount: true,
            ratingAvg: true,
            ratingCount: true,
            contentVersion: true,
            owner: { select: { email: true } },
            updatedAt: true,
            _count: { select: { items: true } }
          }
        }
      }
    }),
    getUserDownloadedWordCount(user.id),
    prisma.wordbookStudyItemState.count({
      where: {
        userId: user.id,
        lastResult: LastResult.CORRECT,
        updatedAt: {
          gte: dayStart,
          lt: dayEnd
        }
      }
    })
  ]);

  const downloadedWordbookIds = downloaded.map((d) => d.wordbook.id);
  const minVersions = new Map<number, number>();
  for (const d of downloaded) {
    const prev = minVersions.get(d.wordbook.id);
    if (prev === undefined || d.downloadedVersion < prev) {
      minVersions.set(d.wordbook.id, d.downloadedVersion);
    }
  }

  const logs = downloadedWordbookIds.length
    ? await prisma.wordbookVersionLog.findMany({
        where: {
          wordbookId: { in: downloadedWordbookIds },
          version: { gt: Math.min(...Array.from(minVersions.values())) }
        },
        select: { wordbookId: true, version: true, addedCount: true, updatedCount: true, deletedCount: true }
      })
    : [];

  const summaryByWordbook = new Map<number, { addedCount: number; updatedCount: number; deletedCount: number }>();
  for (const d of downloaded) {
    const relevant = logs.filter((l) => l.wordbookId === d.wordbook.id && l.version > d.downloadedVersion);
    summaryByWordbook.set(d.wordbook.id, aggregateVersionLogs(relevant));
  }

  const staleDecks = downloaded.filter((d) => d.wordbook.contentVersion > d.downloadedVersion).length;
  const activeDecks = mine.length + downloaded.length;
  const dailyGoal = Math.max(1, user.dailyGoal || 30);
  const studyRate = Math.min(100, Math.round((todayCorrect / dailyGoal) * 100));

  const lastStudyIdRaw = reqCookies.get("last_study_wordbook_id")?.value ?? "";
  const lastStudyIdNum = Number(lastStudyIdRaw);
  const lastStudyId = Number.isFinite(lastStudyIdNum) && lastStudyIdNum > 0 ? Math.floor(lastStudyIdNum) : null;
  const hasLastStudyDeck =
    lastStudyId !== null &&
    (downloaded.some((d) => d.wordbook.id === lastStudyId) || mine.some((d) => d.id === lastStudyId));

  const suggestedHref =
    hasLastStudyDeck && lastStudyId
      ? `/wordbooks/${lastStudyId}/memorize`
      : downloaded.find((d) => d.wordbook.contentVersion > d.downloadedVersion)?.wordbook.id
      ? `/wordbooks/${downloaded.find((d) => d.wordbook.contentVersion > d.downloadedVersion)!.wordbook.id}/memorize`
      : downloaded[0]?.wordbook?.id
        ? `/wordbooks/${downloaded[0].wordbook.id}/memorize`
        : mine[0]?.id
          ? `/wordbooks/${mine[0].id}/memorize`
          : "/wordbooks/new";
  const suggestedLabel =
    hasLastStudyDeck ? "마지막 단어장 이어서" : staleDecks > 0 ? "업데이트 단어장 확인" : downloaded.length > 0 ? "마지막 단어장 이어서" : "첫 단어장 만들기";

  return (
    <section className="space-y-6">
      <PostDownloadOnboardingBanner availableWordbookIds={downloadedWordbookIds} />
      <LearningDashboardHeader
        studyRate={studyRate}
        todayCorrect={todayCorrect}
        dailyGoal={dailyGoal}
        activeDecks={activeDecks}
        staleDecks={staleDecks}
        suggestedHref={suggestedHref}
        suggestedLabel={suggestedLabel}
      />
      <header className="flex flex-wrap items-end gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            단어장
          </p>
          <h1 className="ui-h2 mt-2">내 단어장</h1>
          <p className="ui-body mt-2">
            직접 단어장을 만들거나 공개 단어장을 다운로드하세요.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            요금제: <span className="font-semibold">{user.plan}</span>
            {user.plan === "FREE" ? (
              <>
                {" "}
                - 다운로드 사용량: <span className="font-semibold">{downloadedWordCount}/{FREE_DOWNLOAD_WORD_LIMIT}단어</span> - 무료
                업로드는 공개 고정 -{" "}
                <Link
                  href={{ pathname: "/pricing" }}
                  className="font-semibold text-blue-700 hover:underline"
                >
                  업그레이드
                </Link>
              </>
            ) : null}
            {user.isAdmin ? (
              <>
                {" "}
                -{" "}
                <Link
                  href={{ pathname: "/admin" }}
                  className="font-semibold text-blue-700 hover:underline"
                >
                  관리자
                </Link>
              </>
            ) : null}
          </p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <Link
            href={{ pathname: "/wordbooks/new" }}
            className="ui-btn-accent px-4 py-2 text-sm"
          >
            새 단어장
          </Link>
          <Link
            href={{ pathname: "/wordbooks/market" }}
            className="ui-btn-secondary px-4 py-2 text-sm"
          >
            마켓
          </Link>
          <Link
            href={{ pathname: "/offline" }}
            className="ui-btn-secondary px-4 py-2 text-sm"
          >
            오프라인
          </Link>
          <Link
            href={{ pathname: "/wordbooks/blocked" }}
            className="ui-btn-secondary px-4 py-2 text-sm"
          >
            블랙리스트
          </Link>
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-700">
          내가 만든 단어장
        </h2>
        {mine.length === 0 ? (
          <EmptyStateCard
            title="아직 만든 단어장이 없습니다"
            description="첫 단어장을 만들고 학습 루틴을 시작해보세요."
            primary={{ label: "새 단어장 만들기", href: "/wordbooks/new" }}
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {mine.map((wb) => (
              <Link
                key={wb.id}
                href={{ pathname: `/wordbooks/${wb.id}` }}
                className="ui-card p-4 transition hover:-translate-y-0.5 hover:border-blue-300"
              >
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-lg font-black text-slate-900">{wb.title}</h3>
                      <span
                        className={[
                          "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                          wb.isPublic
                            ? "border border-blue-200 bg-blue-50 text-blue-800"
                            : "border border-slate-200 bg-slate-50 text-slate-700"
                        ].join(" ")}
                      >
                        {wb.isPublic ? "공개" : "비공개"}
                      </span>
                    </div>
                    {splitWordbookDescription(wb.description).displayDescription ? (
                      <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                        {splitWordbookDescription(wb.description).displayDescription}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                      <span>{wb._count.items}개 단어</span>
                      <span>{wb.downloadCount}회 다운로드</span>
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
          다운로드한 단어장(읽기 전용)
        </h2>
        {downloaded.length === 0 ? (
          <EmptyStateCard
            title="다운로드한 단어장이 없습니다"
            description="마켓에서 단어장을 내려받아 바로 암기/퀴즈를 시작할 수 있습니다."
            primary={{ label: "마켓 둘러보기", href: "/wordbooks/market" }}
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {downloaded.map((d) => (
              <div
                key={d.wordbook.id}
                className="ui-card p-4"
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
                      <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-800">
                        다운로드됨
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      제작자 {maskEmailAddress(d.wordbook.owner.email)} - 다운로드일{" "}
                      {d.createdAt.toISOString().slice(0, 10)}
                    </p>
                    {splitWordbookDescription(d.wordbook.description).displayDescription ? (
                      <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                        {splitWordbookDescription(d.wordbook.description).displayDescription}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                      <span>{d.wordbook._count.items}개 단어</span>
                      <span>{d.wordbook.downloadCount}회 다운로드</span>
                    </div>
                    <div className="mt-2">
                      <StarRating value={d.wordbook.ratingAvg} count={d.wordbook.ratingCount} />
                    </div>
                    <div className="mt-3">
                      <OfflineSaveButton wordbookId={d.wordbook.id} />
                    </div>
                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                      <p>
                        내 버전 v{d.downloadedVersion} / 최신 v{d.wordbook.contentVersion}
                        {d.wordbook.contentVersion > d.downloadedVersion ? (
                          <span className="ml-2 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 font-semibold text-blue-800">
                            업데이트 가능
                          </span>
                        ) : (
                          <span className="ml-2 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 font-semibold text-blue-800">
                            최신
                          </span>
                        )}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-600">
                        변경 요약: +{summaryByWordbook.get(d.wordbook.id)?.addedCount ?? 0} /
                        ~{summaryByWordbook.get(d.wordbook.id)?.updatedCount ?? 0} /
                        -{summaryByWordbook.get(d.wordbook.id)?.deletedCount ?? 0}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        단어 수 변화: {d.snapshotItemCount} → {d.wordbook._count.items} / 최근 동기화 {d.syncedAt.toISOString().slice(0, 10)}
                      </p>
                      {d.wordbook.contentVersion > d.downloadedVersion ? (
                        <div className="mt-2">
                          <SyncDownloadButton wordbookId={d.wordbook.id} />
                        </div>
                      ) : null}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Link
                        href={{ pathname: `/wordbooks/${d.wordbook.id}/memorize` }}
                        data-testid="library-study-link"
                        className="ui-btn-secondary px-3 py-1.5 text-xs"
                      >
                        암기
                      </Link>
                      <Link
                        href={{ pathname: `/wordbooks/${d.wordbook.id}/quiz-meaning` }}
                        data-testid="library-quiz-link"
                        className="ui-btn-secondary px-3 py-1.5 text-xs"
                      >
                        의미 퀴즈
                      </Link>
                      <Link
                        href={{ pathname: `/wordbooks/${d.wordbook.id}/quiz-word` }}
                        className="ui-btn-secondary px-3 py-1.5 text-xs"
                      >
                        단어 퀴즈
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

