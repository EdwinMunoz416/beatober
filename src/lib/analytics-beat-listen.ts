import type { BeatMedium } from "@/lib/analytics-beat-play";
import { trackEvent } from "@/lib/analytics";

const MIN_LISTEN_MS = 300;
const MAX_LISTEN_MS = 30 * 60 * 1000;

type ActiveListen = {
  day: number;
  medium: BeatMedium;
  startedAt: number;
  segmentId: string;
};

let active: ActiveListen | null = null;
let pageHandlersInstalled = false;

function segmentId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function listenDurationMs(listen: ActiveListen): number {
  const raw = Date.now() - listen.startedAt;
  return Math.min(Math.max(raw, 0), MAX_LISTEN_MS);
}

/** Start (or restart) a beat listening segment after playback begins. */
export function startBeatListen(day: number, medium: BeatMedium): void {
  if (active) {
    flushBeatListen("replaced");
  }
  active = { day, medium, startedAt: Date.now(), segmentId: segmentId() };
}

/**
 * End the current segment and emit `beat_listen` when long enough.
 * Safe to call multiple times — only one event per active segment.
 */
export function flushBeatListen(
  reason:
    | "pause"
    | "ended"
    | "error"
    | "stop"
    | "unmount"
    | "pagehide"
    | "day_change"
    | "replaced",
): void {
  const listen = active;
  if (!listen) return;
  active = null;

  const durationMs = listenDurationMs(listen);
  if (durationMs < MIN_LISTEN_MS) return;

  trackEvent("beat_listen", {
    day: listen.day,
    medium: listen.medium,
    duration_ms: durationMs,
    reason,
    segment: listen.segmentId,
  });
}

/** Flush on tab close / navigation when React may not unmount in time. */
export function ensureBeatListenPageHandlers(): void {
  if (typeof window === "undefined" || pageHandlersInstalled) return;
  pageHandlersInstalled = true;

  window.addEventListener("pagehide", () => flushBeatListen("pagehide"));
}
