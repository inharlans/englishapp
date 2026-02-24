"use client";

import { fetchWordbookStudy } from "@/lib/api/study";

import { useCallback, useEffect, useRef, useState } from "react";

import { MeaningView } from "@/components/MeaningView";
import { SpeakButton } from "@/components/wordbooks/SpeakButton";
import { WordbookStudyTabs } from "@/components/wordbooks/WordbookStudyTabs";
import { useMeaningViewMode } from "@/components/wordbooks/useMeaningViewMode";
import { DensityModeToggle } from "@/components/ui/DensityModeToggle";
import { densityCardClass, useDensityMode } from "@/components/ui/useDensityMode";
import { EmptyStateCard } from "@/components/ui/EmptyStateCard";

type StudyState = {
  studiedCount: number;
  correctCount: number;
  wrongCount: number;
};

type Item = {
  id: number;
  term: string;
  meaning: string;
  pronunciation?: string | null;
  example: string | null;
  exampleMeaning: string | null;
  exampleSentenceEn?: string | null;
  exampleSentenceKo?: string | null;
  exampleSource?: "SOURCE" | "AI" | "NONE" | null;
  partOfSpeech?: "NOUN" | "VERB" | "ADJECTIVE" | "ADVERB" | "PHRASE" | "OTHER" | "UNKNOWN" | null;
  itemState: {
    status: "NEW" | "CORRECT" | "WRONG";
    streak?: number;
  } | null;
};

export function WordbookStudyClient({ wordbookId }: { wordbookId: number }) {
  const [title, setTitle] = useState("");
  const [speakLang, setSpeakLang] = useState<string | undefined>(undefined);
  const [items, setItems] = useState<Item[]>([]);
  const [query, setQuery] = useState("");
  const [hideCorrect, setHideCorrect] = useState(false);
  const [pageSize, setPageSize] = useState(4);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageInput, setPageInput] = useState("1");
  const [totalFiltered, setTotalFiltered] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [studyState, setStudyState] = useState<StudyState>({
    studiedCount: 0,
    correctCount: 0,
    wrongCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [openExamples, setOpenExamples] = useState<Record<number, boolean>>({});
  const searchInputRef = useRef<HTMLInputElement>(null);
  const restoredPrefsRef = useRef(false);
  const { mode, setMode } = useMeaningViewMode();
  const { mode: densityMode, setMode: setDensityMode } = useDensityMode();
  const pageSizeKey = `wordbook_memorize_page_size_${wordbookId}`;
  const pageIndexKey = `wordbook_memorize_page_index_${wordbookId}`;

  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const currentPage = Math.min(Math.max(pageIndex, 0), totalPages - 1);
  const movePage = useCallback((delta: number) => {
    setInfo("");
    setPageIndex((prev) => {
      const next = prev + delta;
      if (next < 0) {
        setInfo("첫 페이지입니다.");
        return 0;
      }
      if (next > totalPages - 1) {
        setInfo("마지막 페이지입니다.");
        return totalPages - 1;
      }
      return next;
    });
  }, [totalPages]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const json = await fetchWordbookStudy({
        wordbookId,
        view: "memorize",
        page: currentPage,
        take: pageSize,
        q: query.trim(),
        hideCorrect
      });
      if (!json.wordbook) throw new Error("학습 상태를 불러오지 못했습니다.");
      setTitle(json.wordbook.title);
      setSpeakLang(json.wordbook.fromLang?.toLowerCase().startsWith("en") ? "en-US" : undefined);
      setItems(json.items ?? []);
      setOpenExamples({});
      if (json.studyState) setStudyState(json.studyState);
      setTotalFiltered(json.paging?.totalFiltered ?? 0);
      setTotalItems(json.paging?.totalItems ?? 0);
      const total = Math.max(1, Math.ceil((json.paging?.totalFiltered ?? 0) / pageSize));
      if (currentPage > total - 1) {
        setPageIndex(total - 1);
      }
    } catch (e) {
      setItems([]);
      setTotalFiltered(0);
      setTotalItems(0);
      setError(e instanceof Error ? e.message : "학습 상태를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [currentPage, hideCorrect, pageSize, query, wordbookId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(`wordbook_memorize_hide_correct_${wordbookId}`);
    if (raw === "1") setHideCorrect(true);
    if (!restoredPrefsRef.current) {
      restoredPrefsRef.current = true;
      const rawSize = Number(window.localStorage.getItem(pageSizeKey) ?? "");
      const rawIndex = Number(window.localStorage.getItem(pageIndexKey) ?? "");
      if (Number.isFinite(rawSize) && rawSize >= 1) setPageSize(Math.min(50, Math.max(1, Math.floor(rawSize))));
      if (Number.isFinite(rawIndex) && rawIndex >= 0) setPageIndex(Math.floor(rawIndex));
    }
  }, [pageIndexKey, pageSizeKey, wordbookId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(pageSizeKey, String(pageSize));
    window.localStorage.setItem(pageIndexKey, String(currentPage));
  }, [currentPage, pageSize, pageIndexKey, pageSizeKey]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        !!target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.getAttribute("contenteditable") === "true");
      if (isTyping) return;

      if (event.key === "/") {
        event.preventDefault();
        searchInputRef.current?.focus();
        setInfo("검색 입력창으로 이동했습니다.");
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        movePage(-1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        movePage(1);
      }
      if (event.key === "Home") {
        event.preventDefault();
        setInfo("");
        setPageIndex(0);
      }
      if (event.key === "End") {
        event.preventDefault();
        setInfo("");
        setPageIndex(totalPages - 1);
      }
      if (event.key.toLowerCase() === "h") {
        event.preventDefault();
        setHideCorrect((prev) => {
          const next = !prev;
          if (typeof window !== "undefined") {
            window.localStorage.setItem(`wordbook_memorize_hide_correct_${wordbookId}`, next ? "1" : "0");
          }
          setPageIndex(0);
          setInfo(next ? "맞춘 단어 숨김을 켰습니다." : "맞춘 단어 숨김을 껐습니다.");
          return next;
        });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [movePage, totalPages, wordbookId]);

  useEffect(() => {
    if (!info) return;
    const timeout = window.setTimeout(() => setInfo(""), 3500);
    return () => window.clearTimeout(timeout);
  }, [info]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPageInput(String(currentPage + 1));
  }, [currentPage]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.cookie = `last_study_wordbook_id=${wordbookId}; Path=/; Max-Age=2592000; SameSite=Lax`;
  }, [wordbookId]);

  const progressPercent =
    totalItems <= 0 ? 0 : Math.round((studyState.correctCount / Math.max(totalItems, 1)) * 100);

  const applyPageInput = () => {
    const n = Number(pageInput);
    if (!Number.isFinite(n)) return;
    const next = Math.min(Math.max(Math.floor(n), 1), totalPages);
    setInfo("");
    if (next === 1) setInfo("첫 페이지로 이동했습니다.");
    if (next === totalPages) setInfo("마지막 페이지로 이동했습니다.");
    setPageIndex(next - 1);
  };

  const toggleHideCorrect = () => {
    setHideCorrect((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(`wordbook_memorize_hide_correct_${wordbookId}`, next ? "1" : "0");
      }
      setPageIndex(0);
      setInfo(next ? "맞춘 단어 숨김을 켰습니다." : "맞춘 단어 숨김을 껐습니다.");
      return next;
    });
  };

  const onQueryChange = (value: string) => {
    setQuery(value);
    setInfo("");
    setPageIndex(0);
  };

  const changePageSize = (next: number) => {
    setInfo("");
    setPageSize(Math.min(50, Math.max(1, next)));
    setPageIndex(0);
  };

  return (
    <section className="space-y-6 pb-28">
      <header className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">단어장 암기</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">{title || "단어장"}</h1>
          <p className="mt-2 text-sm text-slate-600">
            체크 {studyState.studiedCount} / 정답 {studyState.correctCount} / 오답 {studyState.wrongCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">단축키: `/` 검색 · `←/→` 페이지 이동 · `Home/End` 처음/끝 페이지 · `H` 맞춘 단어 숨김 토글</p>
          <p className="mt-1 text-xs text-slate-500">현재 표시: {totalFiltered} / 전체 {totalItems}</p>
        </div>
        <WordbookStudyTabs wordbookId={wordbookId} active="memorize" showBack={false} />
      </header>

      <div className="ui-card p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-slate-600">표시 모드</div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-slate-200 p-1 text-xs">
              <button
                type="button"
                onClick={() => setMode("compact")}
                className={mode === "compact" ? "rounded-md ui-tab-active px-2 py-1 font-semibold" : "rounded-md ui-tab-inactive px-2 py-1"}
              >
                간결
              </button>
              <button
                type="button"
                onClick={() => setMode("detailed")}
                className={mode === "detailed" ? "rounded-md ui-tab-active px-2 py-1 font-semibold" : "rounded-md ui-tab-inactive px-2 py-1"}
              >
                자세히
              </button>
            </div>
            <DensityModeToggle mode={densityMode} onChange={setDensityMode} />
          </div>
        </div>
      </div>

      <div className="ui-card p-4">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>진행률</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

            {error ? (
        <p
          className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {info ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status" aria-live="polite">
          {info}
        </p>
      ) : null}

      <div className="relative min-h-[220px]">
        {loading ? (
          <div className="pointer-events-none absolute right-2 top-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
            불러오는 중...
          </div>
        ) : null}

      {!loading && items.length === 0 ? (
        <EmptyStateCard
          title="학습할 단어가 없습니다"
          description="이 단어장에서 아직 항목이 없거나 현재 표시 조건에 맞는 단어가 없습니다."
          primary={{ label: "단어장 상세로 이동", href: `/wordbooks/${wordbookId}` }}
          secondary={{ label: "마켓 둘러보기", href: "/wordbooks/market" }}
        />
      ) : null}

      <div className="grid gap-2">
        {items.map((item) => (
          <div key={item.id} className={`ui-card ui-fade-in ${densityCardClass(densityMode)}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900">{item.term}</p>
                  <SpeakButton text={item.term} lang={speakLang} iconOnly className="border-slate-300" />
                </div>
                <MeaningView value={item.meaning} mode={mode} className="mt-1 text-sm text-slate-700" />
                {(() => {
                  const exampleEn = item.exampleSentenceEn ?? item.example;
                  const exampleKo = item.exampleSentenceKo ?? item.exampleMeaning;
                  if (!exampleEn) return null;
                  const opened = Boolean(openExamples[item.id]);
                  return (
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenExamples((prev) => ({
                            ...prev,
                            [item.id]: !prev[item.id]
                          }))
                        }
                        className="ui-btn-secondary px-2.5 py-1 text-xs"
                      >
                        {opened ? "예문 숨기기" : "예문 보기"}
                      </button>
                      {opened ? (
                        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                          <p>예문: {exampleEn}</p>
                          {exampleKo ? <p className="mt-1">해석: {exampleKo}</p> : null}
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            {item.partOfSpeech ? (
                              <span className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                                {item.partOfSpeech.toLowerCase()}
                              </span>
                            ) : null}
                            {item.exampleSource === "AI" ? (
                              <span
                                className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700"
                                title="원문에서 추출되지 않아 AI가 생성한 예문입니다."
                              >
                                AI 생성 예문
                              </span>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })()}
                {item.itemState ? (
                  <p className="mt-1 text-xs text-slate-500">
                    상태 {item.itemState.status === "CORRECT" ? "정답" : item.itemState.status === "WRONG" ? "오답" : "새 단어"} / 연속 정답 {item.itemState.streak}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center gap-2 overflow-x-auto px-3 py-2 text-xs">
            <input
              ref={searchInputRef}
              type="search"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="단어 검색"
              aria-label="암기 단어 검색"
              className="min-w-[180px] flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
            />
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setHideCorrect(false);
                if (typeof window !== "undefined") {
                  window.localStorage.setItem(`wordbook_memorize_hide_correct_${wordbookId}`, "0");
                }
                setPageIndex(0);
                setInfo("검색/필터를 초기화했습니다.");
                searchInputRef.current?.focus();
              }}
              className="ui-btn-secondary px-2.5 py-1"
            >
              초기화
            </button>
            <span className="text-slate-500">개수</span>
            <button
              type="button"
              onClick={() => changePageSize(pageSize - 1)}
              disabled={loading}
              className="ui-btn-secondary px-2 py-1"
            >
              -
            </button>
            <span className="w-10 text-center font-semibold text-slate-800">{pageSize}</span>
            <button
              type="button"
              onClick={() => changePageSize(pageSize + 1)}
              disabled={loading}
              className="ui-btn-secondary px-2 py-1"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => {
                setInfo("");
                setPageIndex(0);
              }}
              disabled={loading || currentPage <= 0}
              className="ui-btn-secondary px-2.5 py-1 disabled:cursor-not-allowed disabled:opacity-40"
            >
              처음
            </button>
            <button
              type="button"
              onClick={() => movePage(-1)}
              disabled={loading || currentPage <= 0}
              className="ui-btn-secondary px-2.5 py-1 disabled:cursor-not-allowed disabled:opacity-40"
            >
              이전
            </button>
            <span className="text-slate-500">
              {currentPage + 1}/{totalPages}
            </span>
            <button
              type="button"
              onClick={() => movePage(1)}
              disabled={loading || currentPage >= totalPages - 1}
              className="ui-btn-secondary px-2.5 py-1 disabled:cursor-not-allowed disabled:opacity-40"
            >
              다음
            </button>
            <button
              type="button"
              onClick={() => {
                setInfo("");
                setPageIndex(totalPages - 1);
              }}
              disabled={loading || currentPage >= totalPages - 1}
              className="ui-btn-secondary px-2.5 py-1 disabled:cursor-not-allowed disabled:opacity-40"
            >
              마지막
            </button>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyPageInput();
                }
              }}
              aria-label="이동할 페이지 번호"
              className="w-16 rounded-lg border border-slate-300 bg-white px-2 py-1 text-center text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
            />
            <button
              type="button"
              onClick={applyPageInput}
              disabled={loading}
              className="ui-btn-primary rounded-lg px-3 py-1"
            >
              이동
            </button>
            <button
              type="button"
              onClick={toggleHideCorrect}
              disabled={loading}
              aria-pressed={hideCorrect}
              className={[
                "rounded-lg border px-3 py-1 font-semibold",
                hideCorrect
                  ? "ui-tab-active"
                  : "ui-tab-inactive"
              ].join(" ")}
            >
              맞춘 단어 숨김
            </button>
          </div>
      </div>
    </section>
  );
}



