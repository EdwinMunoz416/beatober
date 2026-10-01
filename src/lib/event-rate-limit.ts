import { createHash } from "node:crypto";
import { getSql } from "@/lib/db";

const VISITOR_LIMIT = 80;
const IP_LIMIT = 160;
const WINDOW_MINUTES = 1;

export function clientIpHash(request: Request): string | null {
  const raw =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip")?.trim();
  if (!raw) return null;
  return createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

/** Returns false when over limit (soft anti-bot). */
export async function allowAnalyticsEvent(
  request: Request,
  visitorId?: string,
): Promise<boolean> {
  const sql = getSql();
  const ipHash = clientIpHash(request);

  if (visitorId) {
    const rows = (await sql`
      SELECT COUNT(*)::int AS c FROM analytics_events
      WHERE visitor_id = ${visitorId}
        AND created_at >= now() - ${WINDOW_MINUTES} * interval '1 minute'
    `) as { c: number }[];
    if ((rows[0]?.c ?? 0) >= VISITOR_LIMIT) return false;
  }

  if (ipHash) {
    const rows = (await sql`
      SELECT COUNT(*)::int AS c FROM analytics_events
      WHERE props->>'_ip_hash' = ${ipHash}
        AND created_at >= now() - ${WINDOW_MINUTES} * interval '1 minute'
    `) as { c: number }[];
    if ((rows[0]?.c ?? 0) >= IP_LIMIT) return false;
  }

  return true;
}

export function ipHashForProps(request: Request): Record<string, string> {
  const h = clientIpHash(request);
  return h ? { _ip_hash: h } : {};
}
