import type { AnalyticsEventName, AnalyticsProps } from "@/lib/analytics-events";
import { dbConfigured, getSql } from "@/lib/db";

export type IngestEvent = {
  eventName: AnalyticsEventName;
  visitorId?: string;
  sessionId?: string;
  day?: number;
  props?: AnalyticsProps;
  path?: string;
  referrerBucket?: string;
};

export async function insertAnalyticsEvent(event: IngestEvent): Promise<void> {
  if (!dbConfigured()) return;

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
      referrer_bucket
    ) VALUES (
      ${event.eventName},
      ${event.visitorId ?? null},
      ${event.sessionId ?? null},
      ${event.day ?? null},
      ${propsJson}::jsonb,
      ${event.path ?? null},
      ${event.referrerBucket ?? null}
    )
  `;
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
