import { track as vercelTrack } from "@vercel/analytics";
import type { AnalyticsEventName, AnalyticsProps } from "@/lib/analytics-events";
import {
  getCachedAudience,
  getCachedDeviceLabel,
  shouldSkipTracking,
} from "@/lib/analytics-audience-client";
import { getReferrerContext } from "@/lib/referrer-classify";
import { getSessionId, getVisitorId } from "@/lib/visitor-id";

function cleanProps(
  properties?: AnalyticsProps,
): Record<string, string | number | boolean | null> {
  const clean: Record<string, string | number | boolean | null> = {};
  if (properties) {
    for (const [k, v] of Object.entries(properties)) {
      if (v !== undefined) clean[k] = v;
    }
  }
  const audience = getCachedAudience();
  if (audience === "internal") {
    clean.audience = "internal";
    const label = getCachedDeviceLabel();
    if (label) clean.device_label = label;
  }
  return clean;
}

function dayFromProps(props?: AnalyticsProps): number | undefined {
  const d = props?.day;
  if (typeof d === "number" && d >= 1 && d <= 31) return d;
  return undefined;
}

/** Dual sink: Vercel Web Analytics + Neon via /api/events. */
export function trackEvent(name: AnalyticsEventName, properties?: AnalyticsProps): void {
  if (typeof window === "undefined") return;
  if (shouldSkipTracking(window.location.pathname)) return;

  const clean = cleanProps(properties);
  if (process.env.NODE_ENV === "development") {
    console.debug("[analytics]", name, clean);
  }

  try {
    vercelTrack(name, clean);
  } catch {
    /* Vercel script optional in dev */
  }

  const ref = getReferrerContext();
  const propsWithReferrer = {
    ...clean,
    referrer_source: ref.source,
    ...(ref.host ? { referrer_host: ref.host } : {}),
    ...(ref.utmSource ? { utm_source: ref.utmSource } : {}),
    ...(ref.utmMedium ? { utm_medium: ref.utmMedium } : {}),
  };

  const body = {
    eventName: name,
    visitorId: getVisitorId(),
    sessionId: getSessionId(),
    day: dayFromProps(properties),
    props: propsWithReferrer,
    path: window.location.pathname,
    referrerBucket: ref.bucket,
    referrerSource: ref.source,
  };

  try {
    const payload = JSON.stringify(body);
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/events", blob);
    } else {
      void fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      });
    }
  } catch {
    /* non-fatal */
  }
}
