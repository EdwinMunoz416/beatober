import { getReferrerContext } from "@/lib/referrer-classify";

const VID_KEY = "beatober_vid";
const SID_KEY = "beatober_sid";

function randomId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function getVisitorId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(VID_KEY);
  if (!id) {
    id = randomId();
    localStorage.setItem(VID_KEY, id);
  }
  return id;
}

export function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = sessionStorage.getItem(SID_KEY);
  if (!id) {
    id = randomId();
    sessionStorage.setItem(SID_KEY, id);
  }
  return id;
}

/** Coarse bucket stored on analytics_events.referrer_bucket */
export function referrerBucket(): string {
  return getReferrerContext().bucket;
}

export function referrerSource(): string {
  return getReferrerContext().source;
}
