import { trackEvent } from "@/lib/analytics";

const MIN_ENGAGEMENT_MS = 1000;
const MAX_ENGAGEMENT_MS = 60 * 60 * 1000;

type EngagementCtx = {
  surface: string;
  day: number | null;
  path: string;
  startedAt: number;
  visibleSince: number;
  accumulatedVisibleMs: number;
};

let current: EngagementCtx | null = null;
let hooksInstalled = false;

function visibleElapsed(ctx: EngagementCtx): number {
  if (typeof document === "undefined") return 0;
  if (document.visibilityState !== "visible") return 0;
  return Math.max(0, Date.now() - ctx.visibleSince);
}

function totalVisibleMs(ctx: EngagementCtx): number {
  return Math.min(
    ctx.accumulatedVisibleMs + visibleElapsed(ctx),
    MAX_ENGAGEMENT_MS,
  );
}

function flushEngagement(
  reason: "route_change" | "pagehide" | "hidden" | "day_change",
): void {
  const ctx = current;
  if (!ctx) return;
  current = null;

  const durationMs = totalVisibleMs(ctx);
  if (durationMs < MIN_ENGAGEMENT_MS) return;

  trackEvent("page_engagement", {
    surface: ctx.surface,
    ...(ctx.day != null ? { day: ctx.day } : {}),
    duration_ms: durationMs,
    reason,
    path: ctx.path,
  });
}

function onVisibilityChange(): void {
  if (!current) return;
  if (document.visibilityState === "hidden") {
    current.accumulatedVisibleMs += visibleElapsed(current);
    current.visibleSince = Date.now();
  } else {
    current.visibleSince = Date.now();
  }
}

function ensureEngagementHooks(): void {
  if (typeof window === "undefined" || hooksInstalled) return;
  hooksInstalled = true;
  window.addEventListener("pagehide", () => flushEngagement("pagehide"));
  document.addEventListener("visibilitychange", onVisibilityChange);
}

/**
 * Track visible time on the current route / day focus.
 * Call when `surface`, `day`, or path changes — previous slice is flushed first.
 */
export function syncPageEngagement(opts: {
  surface: string;
  day: number | null;
  path: string;
}): void {
  if (typeof window === "undefined") return;
  ensureEngagementHooks();

  const path = opts.path.slice(0, 256);
  const same =
    current &&
    current.path === path &&
    current.day === opts.day &&
    current.surface === opts.surface;

  if (same) return;

  flushEngagement("route_change");

  current = {
    surface: opts.surface,
    day: opts.day,
    path,
    startedAt: Date.now(),
    visibleSince: Date.now(),
    accumulatedVisibleMs: 0,
  };
}

/** Flush when selected day changes but path stays on /day/N. */
export function flushPageEngagementForDayChange(): void {
  flushEngagement("day_change");
}
