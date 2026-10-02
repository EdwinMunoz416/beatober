import { trackEvent } from "@/lib/analytics";
import { getReferrerContext } from "@/lib/referrer-classify";

const SESSION_LANDING_KEY = "beatober_session_landing";

function dayFromPath(pathname: string): number | null {
  const m = pathname.match(/^\/day\/(\d{1,2})\/?$/);
  if (!m) return null;
  const n = Number.parseInt(m[1]!, 10);
  return n >= 1 && n <= 31 ? n : null;
}

function isSameSiteReferrer(): boolean {
  if (typeof document === "undefined") return false;
  const ref = document.referrer;
  if (!ref) return false;
  try {
    return new URL(ref).hostname === window.location.hostname;
  } catch {
    return false;
  }
}

/**
 * First page load of the session — tags page_view and may emit share_landing.
 * OG / share links usually land on /day/N with off-site or empty referrer.
 */
export function recordSessionLanding(pathname: string): Record<string, string | boolean> {
  if (typeof window === "undefined") return {};
  if (sessionStorage.getItem(SESSION_LANDING_KEY)) return {};

  sessionStorage.setItem(SESSION_LANDING_KEY, "1");

  const day = dayFromPath(pathname);
  const ref = getReferrerContext();
  const sameSite = isSameSiteReferrer();
  const externalEntry = !sameSite;

  let landingKind: string;
  if (day != null) {
    landingKind = externalEntry ? "day_external" : "day_internal";
  } else if (pathname === "/" || pathname === "") {
    landingKind = "home";
  } else {
    landingKind = "other";
  }

  const props: Record<string, string | boolean> = {
    landing: true,
    landing_kind: landingKind,
    referrer_bucket: ref.bucket,
    referrer_source: ref.source,
  };

  if (day != null && externalEntry) {
    trackEvent("share_landing", {
      day,
      referrer_bucket: ref.bucket,
      referrer_source: ref.source,
      og_hint: ref.bucket === "social" || ref.source === "direct",
    });
  }

  return props;
}
