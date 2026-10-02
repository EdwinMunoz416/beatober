import type { AnalyticsEventName, AnalyticsProps } from "@/lib/analytics-events";
import { resolveAudience, type ResolvedAudience } from "@/lib/device-registry";
import { dbConfigured, getSql } from "@/lib/db";
import { ensureVisitorIdentity } from "@/lib/visitor-identity-store";

export type IngestEvent = {
  eventName: AnalyticsEventName;
  visitorId?: string;
  sessionId?: string;
  day?: number;
  props?: AnalyticsProps;
  path?: string;
  referrerBucket?: string;
  referrerSource?: string;
  geoCountry?: string | null;
  geoRegion?: string | null;
};

export type IngestResult = {
  stored: boolean;
  audience: ResolvedAudience;
};

export async function insertAnalyticsEvent(
  event: IngestEvent,
): Promise<IngestResult> {
  if (!dbConfigured()) {
    return { stored: false, audience: "visitor" };
  }

  const audience = await resolveAudience(event.visitorId);
  if (audience === "ignore") {
    return { stored: false, audience: "ignore" };
  }

  const sql = getSql();
  const propsJson = JSON.stringify(sanitizeProps(event.props ?? {}));

  await sql`
    INSERT INTO analytics_events (
      event_name,
      visitor_id,
      session_id,
      day,
      props,
      path,
      referrer_bucket,
      referrer_source,
      geo_country,
      geo_region,
      audience
    ) VALUES (
      ${event.eventName},
      ${event.visitorId ?? null},
      ${event.sessionId ?? null},
      ${event.day ?? null},
      ${propsJson}::jsonb,
      ${event.path ?? null},
      ${event.referrerBucket ?? null},
      ${event.referrerSource ?? null},
      ${event.geoCountry ?? null},
      ${event.geoRegion ?? null},
      ${audience}
    )
  `;

  if (event.visitorId) {
    await ensureVisitorIdentity(event.visitorId);
  }

  return { stored: true, audience };
}

function sanitizeProps(props: AnalyticsProps): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {};
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined) continue;
    if (typeof k === "string" && k.length <= 64) {
      if (typeof v === "string" && v.length > 500) {
        out[k] = v.slice(0, 500);
      } else {
        out[k] = v as string | number | boolean | null;
      }
    }
  }
  return out;
}
