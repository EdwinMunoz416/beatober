import { trackEvent } from "@/lib/analytics";

const MIN_ENGAGEMENT_MS = 1000;
const MAX_ENGAGEMENT_MS = 60 * 60 * 1000;
/** Chunk long visible sessions (mirrors beat_listen) so totals survive tab kills. */
const ENGAGEMENT_PROGRESS_MS = 30_000;

type EngagementCtx = {
  surface: string;
  day: number | null;
  path: string;
  startedAt: number;
  visibleSince: number;
  accumulatedVisibleMs: number;
};

type EngagementOpts = {
  surface: string;
  day: number | null;
  path: string;
};

let current: EngagementCtx | null = null;
let lastEngagementOpts: EngagementOpts | null = null;
let progressTimer: ReturnType<typeof setInterval> | null = null;
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

function clearProgressTimer(): void {
  if (progressTimer != null) {
    clearInterval(progressTimer);
    progressTimer = null;
  }
}

function emitEngagement(
  ctx: EngagementCtx,
  durationMs: number,
  reason: EngagementFlushReason,
): void {
  if (durationMs < MIN_ENGAGEMENT_MS) return;
  trackEvent("page_engagement", {
    surface: ctx.surface,
    ...(ctx.day != null ? { day: ctx.day } : {}),
    duration_ms: durationMs,
    reason,
    path: ctx.path,
  });
}

type EngagementFlushReason =
  | "route_change"
  | "pagehide"
  | "hidden"
  | "day_change"
  | "interval"
  | "unmount";

function resetSliceAccumulation(ctx: EngagementCtx): EngagementCtx {
  return {
    ...ctx,
    startedAt: Date.now(),
    visibleSince: Date.now(),
    accumulatedVisibleMs: 0,
  };
}

function startProgressTimer(): void {
  clearProgressTimer();
  progressTimer = setInterval(() => {
    const ctx = current;
    if (!ctx || document.visibilityState !== "visible") return;
    const durationMs = totalVisibleMs(ctx);
    emitEngagement(ctx, durationMs, "interval");
    current = resetSliceAccumulation(ctx);
  }, ENGAGEMENT_PROGRESS_MS);
}

function flushEngagement(
  reason: EngagementFlushReason,
  opts?: { endSlice?: boolean },
): void {
  const ctx = current;
  if (!ctx) return;

  clearProgressTimer();
  const durationMs = totalVisibleMs(ctx);
  emitEngagement(ctx, durationMs, reason);

  const endSlice = opts?.endSlice !== false;
  if (endSlice) {
    current = null;
  } else {
    current = resetSliceAccumulation(ctx);
    startProgressTimer();
  }
}

function beginSlice(opts: EngagementOpts): void {
  lastEngagementOpts = opts;
  current = {
    surface: opts.surface,
    day: opts.day,
    path: opts.path,
    startedAt: Date.now(),
    visibleSince: Date.now(),
    accumulatedVisibleMs: 0,
  };
  startProgressTimer();
}

function onVisibilityChange(): void {
  if (document.visibilityState === "hidden") {
    if (!current) return;
    current.accumulatedVisibleMs += visibleElapsed(current);
    current.visibleSince = Date.now();
    flushEngagement("hidden");
    return;
  }

  if (current) {
    current.visibleSince = Date.now();
    return;
  }

  if (lastEngagementOpts) {
    beginSlice(lastEngagementOpts);
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
export function syncPageEngagement(opts: EngagementOpts): void {
  if (typeof window === "undefined") return;
  ensureEngagementHooks();

  const path = opts.path.slice(0, 256);
  const normalized = { surface: opts.surface, day: opts.day, path };
  const same =
    current &&
    current.path === path &&
    current.day === opts.day &&
    current.surface === opts.surface;

  if (same) return;

  flushEngagement("route_change");
  beginSlice(normalized);
}

/** Flush when selected day changes but path stays on /day/N. */
export function flushPageEngagementForDayChange(): void {
  flushEngagement("day_change");
}

/** Flush on React unmount (route away, strict mode remount). */
export function flushPageEngagementOnUnmount(): void {
  flushEngagement("unmount");
}
