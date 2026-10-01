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

export function referrerBucket(): string {
  if (typeof document === "undefined") return "direct";
  const ref = document.referrer;
  if (!ref) return "direct";
  try {
    const host = new URL(ref).hostname.toLowerCase();
    if (host.includes("google.") || host.includes("bing.")) return "search";
    if (
      host.includes("twitter.") ||
      host.includes("x.com") ||
      host.includes("instagram.") ||
      host.includes("facebook.") ||
      host.includes("tiktok.")
    ) {
      return "social";
    }
    return "other";
  } catch {
    return "other";
  }
}
