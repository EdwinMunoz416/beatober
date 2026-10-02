import { trackEvent } from "@/lib/analytics";

const THRESHOLDS = [25, 50, 75, 100] as const;

let activeDay: number | null = null;
const fired = new Set<number>();

function scrollDepthPct(): number {
  const doc = document.documentElement;
  const scrollTop = window.scrollY || doc.scrollTop;
  const viewport = window.innerHeight || doc.clientHeight;
  const height = Math.max(doc.scrollHeight, doc.offsetHeight) - viewport;
  if (height <= 0) return 100;
  return Math.min(100, Math.round((scrollTop / height) * 100));
}

function maybeTrack(day: number): void {
  const depth = scrollDepthPct();
  for (const t of THRESHOLDS) {
    if (depth >= t && !fired.has(t)) {
      fired.add(t);
      trackEvent("locked_day_scroll", { day, depth_pct: t });
    }
  }
}

/** Window scroll depth on locked day panels (once per threshold per day view). */
export function bindLockedDayScroll(day: number): () => void {
  if (typeof window === "undefined") return () => {};

  if (activeDay !== day) {
    activeDay = day;
    fired.clear();
  }

  const onScroll = () => maybeTrack(day);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  return () => window.removeEventListener("scroll", onScroll);
}
