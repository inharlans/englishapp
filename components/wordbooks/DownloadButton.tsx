"use client";

import { apiFetch } from "@/lib/clientApi";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";

type Props = {
  wordbookId: number;
  disabled?: boolean;
  wordbookTitle?: string;
  redirectPath?: string;
  className?: string;
};

export function DownloadButton({
  wordbookId,
  disabled,
  wordbookTitle,
  redirectPath = "/wordbooks",
  className
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onDownload = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch(`/api/wordbooks/${wordbookId}/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}"
      });
      const json = (await res.json()) as { ok?: boolean; error?: string; wordbookTitle?: string };
      if (!res.ok) throw new Error(json.error ?? "다운로드에 실패했습니다.");
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          "download_onboarding_pending",
          JSON.stringify({
            wordbookId,
            title: json.wordbookTitle ?? wordbookTitle ?? "",
            at: Date.now()
          })
        );
      }
      router.push(redirectPath as Route);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "다운로드에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={onDownload}
        data-testid="download-wordbook"
        disabled={loading || disabled}
        aria-busy={loading}
        className={[
          "ui-btn-accent px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-60",
          className ?? ""
        ].join(" ")}
      >
        {loading ? "다운로드 중..." : "다운로드"}
      </button>
      {error ? (
        <p className="mt-1 text-xs text-blue-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}




