"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";

import { apiFetch } from "@/lib/clientApi";
import {
  type DownloadedWordbookOption,
  type StudySource,
  parseStudySource,
  serializeStudySource
} from "@/lib/studySource";

type DownloadedResponse = {
  wordbooks?: Array<{
    id: number;
    title: string;
    owner?: { email: string };
    _count?: { items: number };
  }>;
  error?: string;
};

export function useStudySource() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [downloaded, setDownloaded] = useState<DownloadedWordbookOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const source = useMemo(
    () => parseStudySource(searchParams.get("source")),
    [searchParams]
  );

  const setSource = useCallback(
    (next: StudySource) => {
      const params = new URLSearchParams(searchParams.toString());
      const serialized = serializeStudySource(next);
      params.set("source", serialized);
      if (next.kind !== "core") {
        params.delete("scope");
        params.delete("week");
      }
      const query = params.toString();
      const href = query ? `${pathname}?${query}` : pathname;
      router.replace(href as Route);
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await apiFetch("/api/wordbooks/downloaded", { cache: "no-store" });
        const data = (await res.json()) as DownloadedResponse;
        if (!res.ok) throw new Error(data.error ?? "Failed to load downloaded wordbooks.");
        const mapped =
          data.wordbooks?.map((wb) => ({
            id: wb.id,
            title: wb.title,
            ownerEmail: wb.owner?.email ?? "-",
            itemCount: wb._count?.items ?? 0
          })) ?? [];
        setDownloaded(mapped);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load downloaded wordbooks.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    if (source.kind !== "wordbook") return;
    if (loading) return;
    if (downloaded.some((wb) => wb.id === source.wordbookId)) return;
    setSource({ kind: "core" });
  }, [downloaded, loading, setSource, source]);

  return { source, setSource, downloaded, loading, error };
}
