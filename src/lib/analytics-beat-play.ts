import { trackEvent } from "@/lib/analytics";

/** How the beat was delivered (extend when you add new upload types). */
export type BeatMedium = "strudel" | "audio";

/**
 * Canonical “someone played the beat” event — Strudel, HTML audio, or future file types.
 * Admin metrics roll up all `beat_play` rows; `medium` splits Strudel vs file in breakdowns.
 */
export function trackBeatPlay(
  day: number,
  medium: BeatMedium,
  opts?: { repeat?: boolean },
): void {
  trackEvent("beat_play", {
    day,
    medium,
    ...(opts?.repeat ? { repeat: true } : {}),
  });
}
