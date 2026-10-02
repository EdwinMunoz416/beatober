/** Allowed first-party (+ Vercel) event names. */
export const ANALYTICS_EVENTS = [
  "page_view",
  "day_view",
  "day_select",
  "day_locked_interaction",
  /** @deprecated use beat_play + medium; still accepted for legacy rows */
  "play_beat",
  "beat_play",
  "beat_ended",
  "beat_error",
  /** @deprecated client emits beat_play(medium=strudel); kept for legacy ingest */
  "strudel_play",
  "strudel_stop",
  "strudel_error",
  /** Visible time on a route / day before leave or hide */
  "page_engagement",
  /** Scroll depth milestones on locked days */
  "locked_day_scroll",
  /** Completed beat listening segment (duration + reason) */
  "beat_listen",
  /** One full Strudel cycle or full audio file playthrough */
  "beat_loop_complete",
  /** First session hit on /day/N from off-site (share / OG / message link) */
  "share_landing",
  /** Heartbeat for live admin (activity + path + day) */
  "visitor_presence",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

const SET = new Set<string>(ANALYTICS_EVENTS);

export function isAllowedEvent(name: string): name is AnalyticsEventName {
  return SET.has(name);
}

export type AnalyticsProps = Record<
  string,
  string | number | boolean | null | undefined
>;
