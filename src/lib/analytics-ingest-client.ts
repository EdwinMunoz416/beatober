import type { AnalyticsEventName, AnalyticsProps } from "@/lib/analytics-events";
import {
  getCachedAudience,
  getCachedDeviceLabel,
} from "@/lib/analytics-audience-client";
import { getSessionId, getVisitorId } from "@/lib/visitor-id";

export type IngestPayload = {
  eventName: AnalyticsEventName;
  day?: number;
  props?: AnalyticsProps;
  path: string;
  referrerBucket?: string;
  referrerSource?: string;
};

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

export function postAnalyticsPayload(payload: IngestPayload): void {
  if (typeof window === "undefined") return;

  const clean = cleanProps(payload.props);

  const body = {
    eventName: payload.eventName,
    visitorId: getVisitorId(),
    sessionId: getSessionId(),
    day: payload.day,
    props: clean,
    path: payload.path,
    referrerBucket: payload.referrerBucket,
    referrerSource: payload.referrerSource,
  };

  try {
    const serialized = JSON.stringify(body);
    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        "/api/events",
        new Blob([serialized], { type: "application/json" }),
      );
    } else {
      void fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: serialized,
        keepalive: true,
      });
    }
  } catch {
    /* non-fatal */
  }
}
