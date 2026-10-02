import type { AnalyticsProps } from "@/lib/analytics-events";
import { getCachedAudience } from "@/lib/analytics-audience-client";
import { postAnalyticsPayload } from "@/lib/analytics-ingest-client";
import { getReferrerContext } from "@/lib/referrer-classify";

export type VisitorActivity =
  | "browsing"
  | "listening_strudel"
  | "listening_audio"
  | "locked_day";

let currentActivity: VisitorActivity = "browsing";

export function setVisitorActivity(activity: VisitorActivity): void {
  currentActivity = activity;
}

export function getVisitorActivity(): VisitorActivity {
  return currentActivity;
}

function shouldSendPresence(pathname: string): boolean {
  if (pathname.startsWith("/admin")) return false;
  if (getCachedAudience() === "ignore") return false;
  return true;
}

/** Heartbeat for live admin — not blocked by author mode (works on localhost). */
export function trackVisitorPresence(opts: {
  path: string;
  day: number | null;
}): void {
  if (typeof window === "undefined") return;
  if (!shouldSendPresence(opts.path)) return;

  const ref = getReferrerContext();
  const props: AnalyticsProps = {
    activity: currentActivity,
    path: opts.path,
    ...(opts.day != null ? { day: opts.day } : {}),
  };

  postAnalyticsPayload({
    eventName: "visitor_presence",
    day: opts.day ?? undefined,
    props: {
      ...props,
      referrer_source: ref.source,
      ...(ref.host ? { referrer_host: ref.host } : {}),
    },
    path: opts.path,
    referrerBucket: ref.bucket,
    referrerSource: ref.source,
  });
}
