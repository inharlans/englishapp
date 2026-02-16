import Link from "next/link";
import { cookies } from "next/headers";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { prisma } from "@/lib/prisma";
import { StarRating } from "@/components/wordbooks/StarRating";
import { OfflineSaveButton } from "@/components/wordbooks/OfflineSaveButton";
import { SyncDownloadButton } from "@/components/wordbooks/SyncDownloadButton";
import { PostDownloadOnboardingBanner } from "@/components/wordbooks/PostDownloadOnboardingBanner";
import { LearningDashboardHeader } from "@/components/wordbooks/LearningDashboardHeader";
import { aggregateVersionLogs } from "@/lib/wordbookVersion";
import { EmptyStateCard } from "@/components/ui/EmptyStateCard";

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

  const [mine, downloaded, downloadsUsed, studyAgg] = await Promise.all([
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
    prisma.wordbookDownload.count({
      where: { userId: user.id }
    }),
    prisma.wordbookStudyState.aggregate({
      where: { userId: user.id },
      _sum: { studiedCount: true, correctCount: true }
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
  const studiedSum = studyAgg._sum.studiedCount ?? 0;
  const correctSum = studyAgg._sum.correctCount ?? 0;
  const studyRate = studiedSum > 0 ? Math.round((correctSum / studiedSum) * 100) : 0;
  const suggestedHref =
    downloaded.find((d) => d.wordbook.contentVersion > d.downloadedVersion)?.wordbook.id
      ? `/wordbooks/${downloaded.find((d) => d.wordbook.contentVersion > d.downloadedVersion)!.wordbook.id}/memorize`
      : downloaded[0]?.wordbook?.id
        ? `/wordbooks/${downloaded[0].wordbook.id}/memorize`
        : mine[0]?.id
          ? `/wordbooks/${mine[0].id}/memorize`
          : "/wordbooks/new";
  const suggestedLabel = staleDecks > 0 ? "업데이트 단어장 확인" : downloaded.length > 0 ? "마지막 단어장 이어서" : "첫 단어장 만들기";

  return (
    <section className="space-y-6">
      <PostDownloadOnboardingBanner availableWordbookIds={downloadedWordbookIds} />
      <LearningDashboardHeader
        studyRate={studyRate}
        activeDecks={activeDecks}
        staleDecks={staleDecks}
        suggestedHref={suggestedHref}
        suggestedLabel={suggestedLabel}
      />
      <header className="flex flex-wrap items-end gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Wordbooks
          </p>
          <h1 className="ui-h2 mt-2">My Library</h1>
          <p className="ui-body mt-2">
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
          <Link
            href={{ pathname: "/wordbooks/blocked" }}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            Blocked
          </Link>
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-700">
          Created
        </h2>
        {mine.length === 0 ? (
          <EmptyStateCard
            title="아직 만든 단어장이 없습니다"
            description="첫 단어장을 만들고 학습 루틴을 시작해보세요."
            primary={{ label: "새 단어장 만들기", href: "/wordbooks/new" }}
            secondary={{ label: "마켓 둘러보기", href: "/wordbooks/market" }}
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {mine.map((wb) => (
              <Link
                key={wb.id}
                href={{ pathname: `/wordbooks/${wb.id}/memorize` }}
                className="ui-card p-4 transition hover:-translate-y-0.5 hover:border-teal-300"
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
          <EmptyStateCard
            title="다운로드한 단어장이 없습니다"
            description="마켓에서 단어장을 내려받아 바로 암기/퀴즈를 시작할 수 있습니다."
            primary={{ label: "마켓 둘러보기", href: "/wordbooks/market" }}
            secondary={{ label: "내 단어장 만들기", href: "/wordbooks/new" }}
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
                        href={{ pathname: `/wordbooks/${d.wordbook.id}/memorize` }}
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
                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                      <p>
                        내 버전 v{d.downloadedVersion} / 최신 v{d.wordbook.contentVersion}
                        {d.wordbook.contentVersion > d.downloadedVersion ? (
                          <span className="ml-2 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-semibold text-amber-800">
                            업데이트 가능
                          </span>
                        ) : (
                          <span className="ml-2 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-800">
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
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-slate-50"
                      >
                        Memorize
                      </Link>
                      <Link
                        href={{ pathname: `/wordbooks/${d.wordbook.id}/quiz-meaning` }}
                        data-testid="library-quiz-link"
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-slate-50"
                      >
                        Quiz Meaning
                      </Link>
                      <Link
                        href={{ pathname: `/wordbooks/${d.wordbook.id}/quiz-word` }}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-slate-50"
                      >
                        Quiz Word
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
