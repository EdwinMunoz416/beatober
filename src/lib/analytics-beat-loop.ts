import type { BeatMedium } from "@/lib/analytics-beat-play";
import { trackEvent } from "@/lib/analytics";
import { readStrudelCycleNow } from "@/lib/strudel-boot";

/** One full pattern cycle (Strudel) or full file playthrough (audio). */
export function trackBeatLoopComplete(
  day: number,
  medium: BeatMedium,
  loopIndex: number,
): void {
  if (loopIndex < 1) return;
  trackEvent("beat_loop_complete", {
    day,
    medium,
    loop: loopIndex,
  });
}

let rafId: number | null = null;
let watchDay: number | null = null;
let lastIntegerCycle = 0;
let loopsThisSession = 0;

function cancelWatch(): void {
  if (rafId != null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  watchDay = null;
}

function tick(): void {
  const day = watchDay;
  if (day == null) return;
  const cycle = readStrudelCycleNow();
  if (cycle == null) {
    rafId = requestAnimationFrame(tick);
    return;
  }
  const floor = Math.floor(cycle);
  while (floor > lastIntegerCycle) {
    lastIntegerCycle += 1;
    loopsThisSession += 1;
    trackBeatLoopComplete(day, "strudel", loopsThisSession);
  }
  rafId = requestAnimationFrame(tick);
}

/** Count each completed Strudel cycle while the scheduler is running. */
export function startStrudelLoopWatch(day: number): void {
  stopStrudelLoopWatch();
  watchDay = day;
  loopsThisSession = 0;
  const cycle = readStrudelCycleNow();
  lastIntegerCycle =
    cycle != null ? Math.floor(cycle) : 0;
  rafId = requestAnimationFrame(tick);
}

export function stopStrudelLoopWatch(): void {
  cancelWatch();
  lastIntegerCycle = 0;
  loopsThisSession = 0;
}
