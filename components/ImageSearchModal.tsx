"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, X, Loader2, ImageOff } from "lucide-react";
import { useModalHistory } from "@/components/Modal";

interface SearchResult {
  id: string;
  title: string;
  thumbnail: string;
  creator: string;
  license: string;
  source: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  // Receives a base64 data URL ready to store / print.
  onInsert: (dataUrl: string) => void;
  // When true the picker stays open after inserting so several images can be
  // added in a row (used for question-level image grids).
  multiple?: boolean;
  initialQuery?: string;
}

export default function ImageSearchModal({
  open,
  onClose,
  onInsert,
  multiple = false,
  initialQuery = "",
}: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [submitted, setSubmitted] = useState("");
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [insertingId, setInsertingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Android Back closes the picker instead of leaving the paper.
  useModalHistory(open, onClose);

  const runSearch = useCallback(async (q: string, p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/image-search?q=${encodeURIComponent(q)}&page=${p}`
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Search failed.");
        if (p === 1) setResults([]);
      } else {
        setResults((prev) =>
          p === 1 ? data.results : [...prev, ...data.results]
        );
        setHasMore(!!data.hasMore);
        if (p === 1 && data.results.length === 0) {
          setError("No images found. Try a different word.");
        }
      }
    } catch {
      setError("Could not reach the image library.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Focus the search box when opened, and auto-run a search when the caller
  // pre-filled a query (e.g. "apple" for a "(Image of an apple)" placeholder).
  useEffect(() => {
    if (!open) return;
    setTimeout(() => inputRef.current?.focus(), 50);
    const seed = initialQuery.trim();
    if (seed) {
      setQuery(seed);
      setSubmitted(seed);
      setPage(1);
      runSearch(seed, 1);
    }
    // Deliberately runs each time the picker opens, so a fresh subject
    // triggers a fresh search.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialQuery]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSubmitted(q);
    setPage(1);
    runSearch(q, 1);
  };

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    runSearch(submitted, next);
  };

  const handlePick = async (r: SearchResult) => {
    if (insertingId) return;
    setInsertingId(r.id);
    try {
      const res = await fetch(`/api/image-fetch?id=${encodeURIComponent(r.id)}`);
      const data = await res.json();
      if (!res.ok || !data.dataUrl) {
        setError(data.error || "Could not add that image. Try another.");
        return;
      }
      onInsert(data.dataUrl);
      if (!multiple) onClose();
    } catch {
      setError("Could not add that image. Try another.");
    } finally {
      setInsertingId(null);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[60]">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl max-h-[88dvh] sm:max-h-[85dvh] overflow-hidden sm:mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-rule shrink-0">
          <h2 className="text-lg font-semibold text-ink">Search Images</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-rule rounded-xl transition-colors active:bg-rule"
          >
            <X size={22} className="text-graphite" />
          </button>
        </div>

        {/* Search bar */}
        <form onSubmit={submit} className="px-5 pt-4 pb-2 shrink-0">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-graphite"
              />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. apple, clock, tiger, water cycle…"
                className="w-full pl-10 pr-3 py-2.5 border border-rule rounded-xl text-sm focus:ring-2 focus:ring-ink focus:border-ink outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-5 py-2.5 bg-ink text-white rounded-xl font-medium text-sm hover:bg-ink disabled:opacity-50 transition-colors active:scale-95"
            >
              Search
            </button>
          </div>
          <p className="text-[11px] text-graphite mt-1.5">
            Free Creative-Commons images from Openverse. Click any image to insert it.
          </p>
        </form>

        {/* Results */}
        {/* "Load more" is the last control in the sheet — keep it clear of the
            Android gesture strip. */}
        <div className="flex-1 overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {error && (
            <div className="flex flex-col items-center justify-center py-12 text-graphite">
              <ImageOff size={32} className="mb-2" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {!error && !submitted && (
            <div className="flex flex-col items-center justify-center py-12 text-graphite text-center">
              <Search size={32} className="mb-2" />
              <p className="text-sm">
                Type a word above to find pictures, clipart and diagrams.
              </p>
            </div>
          )}

          {results.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {results.map((r) => (
                <button
                  key={r.id}
                  onClick={() => handlePick(r)}
                  disabled={!!insertingId}
                  title={r.title || r.license}
                  className="relative group aspect-square bg-paper rounded-lg overflow-hidden border border-rule hover:border-ink transition-colors active:scale-95 disabled:opacity-60"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={r.thumbnail}
                    alt={r.title || "image"}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                  {r.license && (
                    <span className="absolute bottom-0 left-0 right-0 bg-black/55 text-white text-[8px] px-1 py-0.5 truncate">
                      {r.license}
                    </span>
                  )}
                  {insertingId === r.id && (
                    <span className="absolute inset-0 bg-white/70 flex items-center justify-center">
                      <Loader2 size={20} className="animate-spin text-ink" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-6 text-graphite">
              <Loader2 size={22} className="animate-spin" />
            </div>
          )}

          {!loading && hasMore && results.length > 0 && (
            <button
              onClick={loadMore}
              className="mt-4 w-full py-2.5 border border-rule rounded-xl text-sm font-medium text-graphite hover:bg-paper transition-colors"
            >
              Load more
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
