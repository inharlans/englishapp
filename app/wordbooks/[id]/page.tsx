import Link from "next/link";
import { cookies } from "next/headers";

import { getUserFromRequestCookies } from "@/lib/authServer";
import { prisma } from "@/lib/prisma";
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
import { aggregateVersionLogs } from "@/lib/wordbookVersion";
import { StarRating } from "@/components/wordbooks/StarRating";

function parseId(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

export default async function WordbookDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id: idRaw } = await props.params;
  const id = parseId(idRaw);
  if (!id) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">Invalid wordbook</h1>
        <Link
          href={{ pathname: "/wordbooks/market" }}
          className="text-sm font-semibold text-blue-700 hover:underline"
        >
          Back
        </Link>
      </section>
    );
  }

  const user = await getUserFromRequestCookies(await cookies());

  const wordbook = await prisma.wordbook.findUnique({
    where: { id },
    select: {
      id: true,
      ownerId: true,
      title: true,
      description: true,
      fromLang: true,
      toLang: true,
      isPublic: true,
      hiddenByAdmin: true,
      downloadCount: true,
      ratingAvg: true,
      ratingCount: true,
      contentVersion: true,
      createdAt: true,
      updatedAt: true,
      owner: { select: { email: true } },
      items: {
        orderBy: [{ position: "asc" }, { id: "asc" }],
        select: {
          id: true,
          term: true,
          meaning: true,
          pronunciation: true,
          example: true,
          exampleMeaning: true,
          position: true
        }
      }
    }
  });

  if (!wordbook) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">Not found</h1>
        <Link
          href={{ pathname: "/wordbooks/market" }}
          className="text-sm font-semibold text-blue-700 hover:underline"
        >
          Back
        </Link>
      </section>
    );
  }

  const isOwner = user ? wordbook.ownerId === user.id : false;
  if ((!wordbook.isPublic || wordbook.hiddenByAdmin) && !isOwner) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">Not found</h1>
        <Link
          href={{ pathname: "/wordbooks/market" }}
          className="text-sm font-semibold text-blue-700 hover:underline"
        >
          Back
        </Link>
      </section>
    );
  }

  const [downloadRow, ratingRow, downloadsUsed] = user
    ? await Promise.all([
        prisma.wordbookDownload.findUnique({
          where: { userId_wordbookId: { userId: user.id, wordbookId: id } },
          select: { createdAt: true, downloadedVersion: true, snapshotItemCount: true, syncedAt: true }
        }),
        prisma.wordbookRating.findUnique({
          where: { userId_wordbookId: { userId: user.id, wordbookId: id } },
          select: { rating: true, review: true }
        }),
        prisma.wordbookDownload.count({
          where: { userId: user.id }
        })
      ])
    : [null, null, 0];

  const downloadedAt = downloadRow?.createdAt ?? null;
  const downloadedVersion = downloadRow?.downloadedVersion ?? null;
  const snapshotItemCount = downloadRow?.snapshotItemCount ?? null;
  const syncedAt = downloadRow?.syncedAt ?? null;
  const myRating = ratingRow?.rating ?? null;
  const myReview = ratingRow?.review ?? null;
  const speakLang = wordbook.fromLang.toLowerCase().startsWith("en") ? "en-US" : undefined;
  const freeLimitReached =
    user?.plan === "FREE" && !downloadedAt && !isOwner && downloadsUsed >= 3;
  const canWriteReview = !!user && (isOwner || !!downloadedAt);

  const versionSummary =
    downloadedVersion && wordbook.contentVersion > downloadedVersion
      ? aggregateVersionLogs(
          await prisma.wordbookVersionLog.findMany({
            where: { wordbookId: id, version: { gt: downloadedVersion } },
            select: { addedCount: true, updatedCount: true, deletedCount: true }
          })
        )
      : { addedCount: 0, updatedCount: 0, deletedCount: 0 };

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Wordbook
          </p>
          <h1 className="mt-2 truncate text-3xl font-black tracking-tight text-slate-900">
            {wordbook.title}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            by {wordbook.owner.email} | {wordbook.items.length} items | {wordbook.downloadCount}{" "}
            downloads{downloadedAt ? ` | downloaded ${downloadedAt.toISOString().slice(0, 10)}` : ""} |{" "}
            {wordbook.isPublic ? "Public" : "Private"}
          </p>
          {wordbook.description ? (
            <p className="mt-2 max-w-3xl text-sm text-slate-700">{wordbook.description}</p>
          ) : null}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Link
            href={{ pathname: "/wordbooks/market" }}
            className="ui-btn-secondary px-4 py-2 text-sm"
          >
            Back
          </Link>
          {!isOwner && wordbook.isPublic && !downloadedAt && user ? (
            <DownloadButton wordbookId={id} wordbookTitle={wordbook.title} disabled={freeLimitReached} />
          ) : null}
          {!isOwner &&
          wordbook.isPublic &&
          !downloadedAt &&
          user?.plan === "FREE" &&
          downloadsUsed >= 3 ? (
            <Link
              href={{ pathname: "/pricing" }}
              className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-900 hover:bg-blue-100"
            >
              Upgrade (limit reached)
            </Link>
          ) : null}
          {!isOwner && downloadedAt ? <OfflineSaveButton wordbookId={id} /> : null}
          {(isOwner || downloadedAt) ? <ResumeStudyButton wordbookId={id} /> : null}
          {!user ? (
            <Link
              href={{ pathname: "/login", query: { next: `/wordbooks/${id}` } }}
              className="ui-btn-secondary px-4 py-2 text-sm"
            >
              Login
            </Link>
          ) : null}
          {isOwner && user?.plan === "PRO" ? (
            <PublishToggle wordbookId={id} isPublic={wordbook.isPublic} />
          ) : null}
        </div>
      </header>

      {isOwner && user?.plan === "FREE" ? (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          Free plan uploads are forced public. Upgrade to PRO to make wordbooks private.
        </div>
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
                <p className="mt-2 text-xs text-slate-600">Download first to rate.</p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <ReportWordbookButton wordbookId={id} />
                {!isOwner ? <BlockOwnerButton wordbookId={id} /> : null}
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-700">
                Public preview mode. Login to rate, comment, or report.
              </p>
              <div className="mt-3">
                <Link
                  href={{ pathname: "/login", query: { next: `/wordbooks/${id}` } }}
                  className="ui-btn-secondary px-4 py-2 text-sm"
                >
                  Login
                </Link>
              </div>
            </>
          )}
        </div>
      ) : null}

      {(isOwner || downloadedAt) && (
        <WordbookStudyTabs wordbookId={id} active="memorize" />
      )}

      {isOwner ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.7)] backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Settings
            </p>
            <h2 className="mt-2 text-xl font-black text-slate-900">Edit Wordbook</h2>
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
              Items
            </p>
            <h2 className="mt-2 text-xl font-black text-slate-900">Add Words</h2>
            <div className="mt-4">
              <AddItemsForm wordbookId={id} />
            </div>
            <div className="mt-4">
              <WordbookImportExportPanel wordbookId={id} />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            Downloaded wordbooks are read-only. You can still save them for offline study.
          </div>
          {downloadedVersion ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">
                내 버전 v{downloadedVersion} / 최신 v{wordbook.contentVersion}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                변경 요약: +{versionSummary.addedCount} / ~{versionSummary.updatedCount} / -
                {versionSummary.deletedCount}
              </p>
              {snapshotItemCount !== null && syncedAt ? (
                <p className="mt-1 text-xs text-slate-500">
                  Word count change: {snapshotItemCount} to {wordbook.items.length} / last sync{" "}
                  {syncedAt.toISOString().slice(0, 10)}
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
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-700">Words</h2>
        {wordbook.items.length === 0 ? (
          <p className="text-sm text-slate-600">No items.</p>
        ) : (
          <div className="grid gap-2">
            {wordbook.items.map((item) => (
              <WordbookItemRow
                key={item.id}
                wordbookId={id}
                item={item}
                editable={isOwner}
                speakLang={speakLang}
              />
            ))}
          </div>
        )}
      </section>
    </section>
  );
}



