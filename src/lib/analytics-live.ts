import { getSql } from "@/lib/db";

export type LiveAudience = "visitor" | "internal" | "all";

export type LiveVisitorRow = {
  visitorId: string;
  displayId: string;
  sessionId: string | null;
  audience: string;
  lastSeenAt: string;
  secondsAgo: number;
  path: string | null;
  day: number | null;
  activity: string;
  referrerSource: string | null;
  geoCountry: string | null;
  geoRegion: string | null;
  lastEventName: string;
};

export type LiveSnapshot = {
  generatedAt: string;
  windowSeconds: number;
  activeCount: number;
  visitors: LiveVisitorRow[];
  dbConfigured: boolean;
  hint: string;
};

const WINDOW_SECONDS = 120;

type RawRow = {
  visitor_id: string;
  session_id: string | null;
  audience: string;
  created_at: Date;
  path: string | null;
  day: number | null;
  event_name: string;
  props: Record<string, unknown> | null;
  referrer_source: string | null;
  geo_country: string | null;
  geo_region: string | null;
};

function readActivity(props: Record<string, unknown> | null): string {
  const a = props?.activity;
  return typeof a === "string" && a.trim() ? a.trim() : "browsing";
}

function parseProps(raw: Record<string, unknown> | null | string): Record<string, unknown> | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  return raw;
}

export async function fetchLiveSnapshot(
  audience: LiveAudience = "visitor",
): Promise<LiveSnapshot> {
  const sql = getSql();
  const windowSeconds = WINDOW_SECONDS;

  let rows: RawRow[];

  if (audience === "internal") {
    rows = (await sql`
      SELECT DISTINCT ON (visitor_id)
        visitor_id,
        session_id,
        audience,
        created_at,
        path,
        day,
        event_name,
        props,
        referrer_source,
        geo_country,
        geo_region
      FROM analytics_events
      WHERE created_at >= now() - interval '120 seconds'
        AND visitor_id IS NOT NULL
        AND audience = 'internal'
        AND event_name = 'visitor_presence'
      ORDER BY visitor_id, created_at DESC
    `) as RawRow[];
  } else if (audience === "all") {
    rows = (await sql`
      SELECT DISTINCT ON (visitor_id)
        visitor_id,
        session_id,
        audience,
        created_at,
        path,
        day,
        event_name,
        props,
        referrer_source,
        geo_country,
        geo_region
      FROM analytics_events
      WHERE created_at >= now() - interval '120 seconds'
        AND visitor_id IS NOT NULL
        AND event_name = 'visitor_presence'
      ORDER BY visitor_id, created_at DESC
    `) as RawRow[];
  } else {
    rows = (await sql`
      SELECT DISTINCT ON (visitor_id)
        visitor_id,
        session_id,
        audience,
        created_at,
        path,
        day,
        event_name,
        props,
        referrer_source,
        geo_country,
        geo_region
      FROM analytics_events
      WHERE created_at >= now() - interval '120 seconds'
        AND visitor_id IS NOT NULL
        AND audience = 'visitor'
        AND event_name = 'visitor_presence'
      ORDER BY visitor_id, created_at DESC
    `) as RawRow[];
  }

  const now = Date.now();

  const visitors: LiveVisitorRow[] = rows.map((row) => {
    const at = new Date(row.created_at).getTime();
    const props = parseProps(row.props);
    return {
      visitorId: row.visitor_id,
      displayId: `${row.visitor_id.slice(0, 8)}…`,
      sessionId: row.session_id ? `${row.session_id.slice(0, 8)}…` : null,
      audience: row.audience,
      lastSeenAt: new Date(row.created_at).toISOString(),
      secondsAgo: Math.max(0, Math.round((now - at) / 1000)),
      path: row.path,
      day: row.day,
      activity: readActivity(props),
      referrerSource: row.referrer_source,
      geoCountry: row.geo_country,
      geoRegion: row.geo_region,
      lastEventName: row.event_name,
    };
  });

  visitors.sort((a, b) => a.secondsAgo - b.secondsAgo);

  return {
    generatedAt: new Date().toISOString(),
    windowSeconds,
    activeCount: visitors.length,
    visitors,
    dbConfigured: true,
    hint:
      "Active = visitor_presence in the last 2 minutes. Localhost works with DATABASE_URL in .env.local; geo is usually unknown locally.",
  };
}
