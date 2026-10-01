/** Allowed first-party (+ Vercel) event names. */
export const ANALYTICS_EVENTS = [
  "page_view",
  "day_view",
  "day_select",
  "day_locked_interaction",
  "play_beat",
  "beat_play",
  "beat_ended",
  "beat_error",
  "strudel_play",
  "strudel_stop",
  "strudel_error",
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
