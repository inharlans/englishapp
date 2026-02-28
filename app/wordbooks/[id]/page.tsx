import Link from "next/link";
import { cookies } from "next/headers";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { AddItemsForm } from "@/components/wordbooks/AddItemsForm";
import { DeleteWordbookButton } from "@/components/wordbooks/DeleteWordbookButton";
import { DownloadButton } from "@/components/wordbooks/DownloadButton";
import { OfflineSaveButton } from "@/components/wordbooks/OfflineSaveButton";
import { PublishToggle } from "@/components/wordbooks/PublishToggle";
import { RateBox } from "@/components/wordbooks/RateBox";
import { ReportWordbookButton } from "@/components/wordbooks/ReportWordbookButton";
import { BlockOwnerButton } from "@/components/wordbooks/BlockOwnerButton";
import { WordbookImportExportPanel } from "@/components/wordbooks/WordbookImportExportPanel";
import { WordbookItemRow } from "@/components/wordbooks/WordbookItemRow";
import { WordbookMetaEditor } from "@/components/wordbooks/WordbookMetaEditor";
import { WordbookStudyTabs } from "@/components/wordbooks/WordbookStudyTabs";
import { SyncDownloadButton } from "@/components/wordbooks/SyncDownloadButton";
import { ResumeStudyButton } from "@/components/wordbooks/ResumeStudyButton";
import { FREE_DOWNLOAD_WORD_LIMIT } from "@/lib/planLimits";
import { StarRating } from "@/components/wordbooks/StarRating";
import { PendingWordbookItemsRetryBanner } from "@/components/wordbooks/PendingWordbookItemsRetryBanner";
import { isPrivateWordbookLockedForFree } from "@/lib/wordbookAccess";
import { maskEmailAddress } from "@/lib/textQuality";
import { splitWordbookDescription } from "@/lib/wordbookPresentation";
import { WordbookPageQueryService } from "@/server/domain/wordbook/page-query-service";

const wordbookPageQueryService = new WordbookPageQueryService();

function parseId(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

function parseNonNegativeInt(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.floor(n);
}

function parseTake(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(200, Math.max(20, Math.floor(n)));
}

function formatDateKst(date: Date): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

export default async function WordbookDetailPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; take?: string }>;
}) {
  const { id: idRaw } = await props.params;
  const searchParams = await props.searchParams;
  const id = parseId(idRaw);
  const page = parseNonNegativeInt(searchParams.page, 0);
  const take = parseTake(searchParams.take, 80);
  if (!id) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">잘못된 단어장입니다</h1>
        <Link
          href={{ pathname: "/wordbooks/market" }}
          className="text-sm font-semibold text-blue-700 hover:underline"
        >
          뒤로
        </Link>
      </section>
    );
  }

  const user = await getUserFromRequestCookies(await cookies());

  const detailData = await wordbookPageQueryService.getWordbookDetailPageData({
    wordbookId: id,
    userId: user?.id ?? null,
    page,
    take
  });
  const wordbook = detailData?.wordbook ?? null;

  if (!wordbook) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">찾을 수 없습니다</h1>
        <Link
          href={{ pathname: "/wordbooks/market" }}
          className="text-sm font-semibold text-blue-700 hover:underline"
        >
          뒤로
        </Link>
      </section>
    );
  }

  const totalItemCount = wordbook._count.items;
  const pageCount = detailData?.pageCount ?? 1;
  const currentPage = detailData?.currentPage ?? 0;
  const pagedItems: NonNullable<typeof detailData>["pagedItems"] = detailData?.pagedItems ?? [];

  const isOwner = user ? wordbook.ownerId === user.id : false;
  if ((!wordbook.isPublic || wordbook.hiddenByAdmin) && !isOwner) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">찾을 수 없습니다</h1>
        <Link
          href={{ pathname: "/wordbooks/market" }}
          className="text-sm font-semibold text-blue-700 hover:underline"
        >
          뒤로
        </Link>
      </section>
    );
  }

  const downloadRow = detailData?.downloadRow ?? null;
  const ratingRow = detailData?.ratingRow ?? null;
  const downloadedWordCount = detailData?.downloadedWordCount ?? 0;

  const downloadedAt = downloadRow?.createdAt ?? null;
  const downloadedVersion = downloadRow?.downloadedVersion ?? null;
  const snapshotItemCount = downloadRow?.snapshotItemCount ?? null;
  const syncedAt = downloadRow?.syncedAt ?? null;
  const myRating = ratingRow?.rating ?? null;
  const myReview = ratingRow?.review ?? null;
  const { displayDescription } = splitWordbookDescription(wordbook.description);
  const speakLang = wordbook.fromLang.toLowerCase().startsWith("en") ? "en-US" : undefined;
  const freeLimitReached =
    user?.plan === "FREE" &&
    !downloadedAt &&
    !isOwner &&
    downloadedWordCount + totalItemCount > FREE_DOWNLOAD_WORD_LIMIT;
  const isPrivateLocked =
    !!user &&
    isPrivateWordbookLockedForFree({
      plan: user.plan,
      isOwner,
      isPublic: wordbook.isPublic
    });
  const canWriteReview = !!user && (isOwner || !!downloadedAt);

  const versionSummary = detailData?.versionSummary ?? { addedCount: 0, updatedCount: 0, deletedCount: 0 };
  const backHref = isOwner || downloadedAt ? "/wordbooks" : "/wordbooks/market";

  return (
    <section className="space-y-6">
      {isOwner ? <PendingWordbookItemsRetryBanner wordbookId={id} /> : null}
      <header className="flex flex-wrap items-end gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            단어장
          </p>
          <h1 className="mt-2 truncate text-3xl font-black tracking-tight text-slate-900">
            {wordbook.title}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            제작자 {maskEmailAddress(wordbook.owner.email)} | 단어 {totalItemCount}개 | 다운로드 {wordbook.downloadCount}회
            {downloadedAt ? ` | 다운로드일 ${formatDateKst(downloadedAt)}` : ""} |{" "}
            {wordbook.isPublic ? "공개" : "비공개"}
          </p>
          {displayDescription ? (
            <p className="mt-2 max-w-3xl text-sm text-slate-700">{displayDescription}</p>
          ) : null}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2" role="group" aria-label="단어장 주요 동작">
          <Link
            href={{ pathname: backHref }}
            className="ui-btn-secondary px-4 py-2 text-sm"
          >
            뒤로
          </Link>
          {!isOwner && wordbook.isPublic && !downloadedAt && user ? (
            <DownloadButton wordbookId={id} wordbookTitle={wordbook.title} disabled={freeLimitReached} />
          ) : null}
          {!isOwner &&
          wordbook.isPublic &&
          !downloadedAt &&
          user?.plan === "FREE" &&
          downloadedWordCount + totalItemCount > FREE_DOWNLOAD_WORD_LIMIT ? (
            <Link
              href={{ pathname: "/pricing" }}
              className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-900 hover:bg-blue-100"
            >
              업그레이드 (한도 도달)
            </Link>
          ) : null}
          {!isOwner && downloadedAt ? <OfflineSaveButton wordbookId={id} /> : null}
          {(isOwner || downloadedAt) && !isPrivateLocked ? <ResumeStudyButton wordbookId={id} /> : null}
          {!user ? (
            <Link
              href={{ pathname: "/login", query: { next: `/wordbooks/${id}` } }}
              className="ui-btn-secondary px-4 py-2 text-sm"
            >
              로그인
            </Link>
          ) : null}
          {isOwner && (user?.plan === "PRO" || !wordbook.isPublic) ? (
            <PublishToggle wordbookId={id} isPublic={wordbook.isPublic} />
          ) : null}
        </div>
      </header>

      {isOwner && user?.plan === "FREE" ? (
        isPrivateLocked ? (
          <div className="space-y-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            <p className="font-semibold">
              현재 비공개 단어장이 잠금 상태입니다.
            </p>
            <p>
              무료 요금제에서는 비공개 단어장을 학습/수정할 수 없습니다. 공개로 전환하거나 PRO로 업그레이드하세요.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href={{ pathname: "/pricing" }} className="ui-btn-accent px-4 py-2 text-sm">
                PRO 업그레이드
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            무료 요금제 업로드는 공개로 고정됩니다. 비공개 단어장을 사용하려면 PRO로 업그레이드하세요.
          </div>
        )
      ) : null}

      {wordbook.isPublic ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          {user ? (
            <>
              {canWriteReview ? (
                <RateBox
                  wordbookId={id}
                  ratingAvg={wordbook.ratingAvg}
                  ratingCount={wordbook.ratingCount}
                  myRating={myRating}
                  myReview={myReview}
                />
              ) : (
                <div className="space-y-2">
                  <StarRating value={wordbook.ratingAvg} count={wordbook.ratingCount} />
                  <p className="text-xs text-slate-600">
                    리뷰는 마켓에서 볼 수 있고, 작성은 다운로드 후 이 페이지에서 가능합니다.
                  </p>
                </div>
              )}
              {!canWriteReview ? (
                <p className="mt-2 text-xs text-slate-600">평가를 남기려면 먼저 다운로드하세요.</p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <ReportWordbookButton wordbookId={id} />
                {!isOwner ? <BlockOwnerButton wordbookId={id} /> : null}
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-700">
                공개 미리보기 모드입니다. 평가/댓글/신고는 로그인 후 사용할 수 있습니다.
              </p>
              <div className="mt-3">
                <Link
                  href={{ pathname: "/login", query: { next: `/wordbooks/${id}` } }}
                  className="ui-btn-secondary px-4 py-2 text-sm"
                >
                  로그인
                </Link>
              </div>
            </>
          )}
        </div>
      ) : null}

      {(isOwner || downloadedAt) && !isPrivateLocked && (
        <WordbookStudyTabs wordbookId={id} active="memorize" showBack={false} />
      )}

      {isOwner && !isPrivateLocked ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.7)] backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              설정
            </p>
            <h2 className="mt-2 text-xl font-black text-slate-900">단어장 수정</h2>
            <div className="mt-4">
              <WordbookMetaEditor
                wordbookId={id}
                title={wordbook.title}
                description={wordbook.description}
                fromLang={wordbook.fromLang}
                toLang={wordbook.toLang}
              />
              <div className="mt-4">
                <DeleteWordbookButton wordbookId={id} />
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.7)] backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              항목
            </p>
            <h2 className="mt-2 text-xl font-black text-slate-900">단어 추가</h2>
            <div className="mt-4">
              <AddItemsForm wordbookId={id} />
            </div>
            <div className="mt-4">
              <WordbookImportExportPanel wordbookId={id} />
            </div>
          </div>
        </div>
      ) : !isOwner ? (
        <div className="space-y-3">
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            다운로드한 단어장은 읽기 전용입니다. 오프라인 학습용 저장은 가능합니다.
          </div>
          {downloadedVersion ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">
                내 버전 v{downloadedVersion} / 최신 v{wordbook.contentVersion}
                <span className="mx-1">/</span>
                <span>상태</span>
                {wordbook.contentVersion > downloadedVersion ? (
                  <span className="ml-2 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-800">
                    업데이트 가능
                  </span>
                ) : (
                  <span className="ml-2 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-800">
                    최신
                  </span>
                )}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                변경 요약: +{versionSummary.addedCount} / ~{versionSummary.updatedCount} / -
                {versionSummary.deletedCount}
              </p>
              {snapshotItemCount !== null && syncedAt ? (
                <p className="mt-1 text-xs text-slate-500">
                  단어 수 변화: {snapshotItemCount}에서 {totalItemCount} / 최근 동기화{" "}
                  {formatDateKst(syncedAt)}
                </p>
              ) : null}
              {wordbook.contentVersion > downloadedVersion ? (
                <div className="mt-3">
                  <SyncDownloadButton wordbookId={id} />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-700">단어 목록</h2>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span>
              {currentPage + 1}/{pageCount} 페이지
            </span>
            <span>·</span>
            <span>페이지당 {take}개</span>
          </div>
        </div>
        {totalItemCount === 0 ? (
          <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
            <p>등록된 단어가 없습니다.</p>
            {isOwner && !isPrivateLocked ? (
              <p>
                아래 <span className="font-semibold">단어 추가</span> 영역에서 항목을 입력해 시작할 수 있습니다.
              </p>
            ) : null}
          </div>
        ) : (
          <>
            <div className="grid gap-2" role="list" aria-label="단어 항목 목록">
              {pagedItems.map((item) => (
                <div key={item.id} role="listitem">
                  <WordbookItemRow
                    wordbookId={id}
                    item={item}
                    editable={isOwner && !isPrivateLocked}
                    speakLang={speakLang}
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-2">
              {currentPage <= 0 ? (
                <span className="ui-btn-secondary cursor-not-allowed px-3 py-1.5 text-xs opacity-50" aria-disabled="true">
                  이전
                </span>
              ) : (
                <Link
                  href={{
                    pathname: `/wordbooks/${id}`,
                    query: { page: String(Math.max(currentPage - 1, 0)), take: String(take) }
                  }}
                  className="ui-btn-secondary px-3 py-1.5 text-xs"
                  aria-label={`${Math.max(currentPage, 1)}페이지로 이동`}
                >
                  이전
                </Link>
              )}
              {currentPage >= pageCount - 1 ? (
                <span className="ui-btn-secondary cursor-not-allowed px-3 py-1.5 text-xs opacity-50" aria-disabled="true">
                  다음
                </span>
              ) : (
                <Link
                  href={{
                    pathname: `/wordbooks/${id}`,
                    query: { page: String(Math.min(currentPage + 1, pageCount - 1)), take: String(take) }
                  }}
                  className="ui-btn-secondary px-3 py-1.5 text-xs"
                  aria-label={`${Math.min(currentPage + 2, pageCount)}페이지로 이동`}
                >
                  다음
                </Link>
              )}
            </div>
          </>
        )}
      </section>
    </section>
  );
}
