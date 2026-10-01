"use client";

import { useCallback, useEffect, useState } from "react";

type Options = {
  viewDay: number;
  initialPatterns: Record<number, string>;
  /** Fetch when the day is playable (Strudel surface visible). */
  enabled: boolean;
};

export function useDayPattern({
  viewDay,
  initialPatterns,
  enabled,
}: Options): {
  code: string;
  loading: boolean;
  error: string | null;
  retry: () => void;
} {
  const [cache, setCache] = useState(initialPatterns);
  const [prevInitialPatterns, setPrevInitialPatterns] =
    useState(initialPatterns);
  if (initialPatterns !== prevInitialPatterns) {
    setPrevInitialPatterns(initialPatterns);
    setCache(initialPatterns);
  }

  const [fetchGen, setFetchGen] = useState(0);
  const [inFlightDay, setInFlightDay] = useState<number | null>(null);
  const [errorByDay, setErrorByDay] = useState<Record<number, string>>({});

  const hasPattern = Object.hasOwn(cache, viewDay);
  const needsFetch = enabled && !hasPattern;

  useEffect(() => {
    if (!needsFetch) return;

    let cancelled = false;

    void (async () => {
      setInFlightDay(viewDay);
      setErrorByDay((prev) => {
        if (!Object.hasOwn(prev, viewDay)) return prev;
        const next = { ...prev };
        delete next[viewDay];
        return next;
      });
      try {
        const res = await fetch(`/api/day/${viewDay}/pattern`, {
          cache: "no-store",
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(data.error ?? res.statusText);
        }
        const data = (await res.json()) as { code?: string };
        if (cancelled) return;
        setCache((prev) => ({
          ...prev,
          [viewDay]: typeof data.code === "string" ? data.code : "",
        }));
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        setErrorByDay((prev) => ({ ...prev, [viewDay]: message }));
      } finally {
        if (!cancelled) setInFlightDay(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [viewDay, needsFetch, fetchGen]);

  const retry = useCallback(() => {
    setErrorByDay((prev) => {
      if (!Object.hasOwn(prev, viewDay)) return prev;
      const next = { ...prev };
      delete next[viewDay];
      return next;
    });
    setFetchGen((g) => g + 1);
  }, [viewDay]);

  const loading = needsFetch && inFlightDay === viewDay;

  return {
    code: cache[viewDay] ?? "",
    loading,
    error: errorByDay[viewDay] ?? null,
    retry,
  };
}
