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
import { WordbookItemRow } from "@/components/wordbooks/WordbookItemRow";
import { WordbookMetaEditor } from "@/components/wordbooks/WordbookMetaEditor";

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
          href={{ pathname: "/wordbooks" }}
          className="text-sm font-semibold text-teal-700 hover:underline"
        >
          Back
        </Link>
      </section>
    );
  }

  const user = await getUserFromRequestCookies(await cookies());
  if (!user) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">Wordbook</h1>
        <p className="text-sm text-slate-600">Login required.</p>
      </section>
    );
  }

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
      downloadCount: true,
      ratingAvg: true,
      ratingCount: true,
      createdAt: true,
      updatedAt: true,
      owner: { select: { email: true } },
      items: {
        orderBy: [{ position: "asc" }, { id: "asc" }],
        select: { id: true, term: true, meaning: true, pronunciation: true, position: true }
      }
    }
  });

  if (!wordbook) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">Not found</h1>
        <Link
          href={{ pathname: "/wordbooks" }}
          className="text-sm font-semibold text-teal-700 hover:underline"
        >
          Back
        </Link>
      </section>
    );
  }

  const isOwner = wordbook.ownerId === user.id;
  if (!wordbook.isPublic && !isOwner) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">Not found</h1>
        <Link
          href={{ pathname: "/wordbooks" }}
          className="text-sm font-semibold text-teal-700 hover:underline"
        >
          Back
        </Link>
      </section>
    );
  }

  const [downloadRow, ratingRow, downloadsUsed] = await Promise.all([
    prisma.wordbookDownload.findUnique({
      where: { userId_wordbookId: { userId: user.id, wordbookId: id } },
      select: { createdAt: true }
    }),
    prisma.wordbookRating.findUnique({
      where: { userId_wordbookId: { userId: user.id, wordbookId: id } },
      select: { rating: true }
    }),
    prisma.wordbookDownload.count({
      where: { userId: user.id }
    })
  ]);

  const downloadedAt = downloadRow?.createdAt ?? null;
  const myRating = ratingRow?.rating ?? null;
  const speakLang = wordbook.fromLang.toLowerCase().startsWith("en") ? "en-US" : undefined;
  const freeLimitReached =
    user.plan === "FREE" && !downloadedAt && !isOwner && downloadsUsed >= 3;

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
            by {wordbook.owner.email} · {wordbook.items.length} items · {wordbook.downloadCount}{" "}
            downloads
            {downloadedAt ? ` · downloaded ${downloadedAt.toISOString().slice(0, 10)}` : ""} ·{" "}
            {wordbook.isPublic ? "Public" : "Private"}
          </p>
          {wordbook.description ? (
            <p className="mt-2 max-w-3xl text-sm text-slate-700">{wordbook.description}</p>
          ) : null}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Link
            href={{ pathname: "/wordbooks" }}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            Back
          </Link>
          {!isOwner && wordbook.isPublic && !downloadedAt ? (
            <DownloadButton wordbookId={id} disabled={freeLimitReached} />
          ) : null}
          {!isOwner &&
          wordbook.isPublic &&
          !downloadedAt &&
          user.plan === "FREE" &&
          downloadsUsed >= 3 ? (
            <Link
              href={{ pathname: "/pricing" }}
              className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100"
            >
              Upgrade (limit reached)
            </Link>
          ) : null}
          {!isOwner && downloadedAt ? <OfflineSaveButton wordbookId={id} /> : null}
          {isOwner && user.plan === "PRO" ? (
            <PublishToggle wordbookId={id} isPublic={wordbook.isPublic} />
          ) : null}
        </div>
      </header>

      {isOwner && user.plan === "FREE" ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Free plan uploads are forced public. Upgrade to PRO to make wordbooks private.
        </div>
      ) : null}

      {wordbook.isPublic ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <RateBox
            wordbookId={id}
            ratingAvg={wordbook.ratingAvg}
            ratingCount={wordbook.ratingCount}
            myRating={myRating}
            disabled={!isOwner && !downloadedAt}
          />
          {!isOwner && !downloadedAt ? (
            <p className="mt-2 text-xs text-slate-600">Download first to rate.</p>
          ) : null}
        </div>
      ) : null}

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
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Downloaded wordbooks are read-only. You can still save them for offline study.
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
