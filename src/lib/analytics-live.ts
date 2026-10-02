import { getSql } from "@/lib/db";
import { isListeningActivity } from "@/lib/live-activity-display";
import { resolveDisplayIdentity } from "@/lib/visitor-identity-store";

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
  lockedNickname: string | null;
  lockedShowTitle: string | null;
  lockedAvatarUrl: string | null;
};

export type LiveSnapshot = {
  generatedAt: string;
  windowSeconds: number;
  activeCount: number;
  listeningCount: number;
  visitors: LiveVisitorRow[];
  listeners: LiveVisitorRow[];
  dbConfigured: boolean;
  hint: string;
};

export const LIVE_PRESENCE_WINDOW_SECONDS = 120;
const WINDOW_SECONDS = LIVE_PRESENCE_WINDOW_SECONDS;

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
  locked_nickname: string | null;
  locked_show_title: string | null;
  locked_avatar_url: string | null;
  locked_character_id: string | null;
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

/** Visitor IDs with a presence heartbeat in the live window. */
export async function fetchOnlineVisitorIds(
  audience: LiveAudience = "visitor",
): Promise<string[]> {
  const sql = getSql();

  if (audience === "internal") {
    const rows = (await sql`
      SELECT DISTINCT visitor_id
      FROM analytics_events
      WHERE created_at >= now() - interval '120 seconds'
        AND visitor_id IS NOT NULL
        AND audience = 'internal'
        AND event_name = 'visitor_presence'
    `) as { visitor_id: string }[];
    return rows.map((r) => r.visitor_id);
  }

  if (audience === "all") {
    const rows = (await sql`
      SELECT DISTINCT visitor_id
      FROM analytics_events
      WHERE created_at >= now() - interval '120 seconds'
        AND visitor_id IS NOT NULL
        AND event_name = 'visitor_presence'
    `) as { visitor_id: string }[];
    return rows.map((r) => r.visitor_id);
  }

  const rows = (await sql`
    SELECT DISTINCT visitor_id
    FROM analytics_events
    WHERE created_at >= now() - interval '120 seconds'
      AND visitor_id IS NOT NULL
      AND audience = 'visitor'
      AND event_name = 'visitor_presence'
  `) as { visitor_id: string }[];
  return rows.map((r) => r.visitor_id);
}

export async function fetchLiveSnapshot(
  audience: LiveAudience = "visitor",
): Promise<LiveSnapshot> {
  const sql = getSql();
  const windowSeconds = WINDOW_SECONDS;

  let rows: RawRow[];

  if (audience === "internal") {
    rows = (await sql`
      SELECT DISTINCT ON (e.visitor_id)
        e.visitor_id,
        e.session_id,
        e.audience,
        e.created_at,
        e.path,
        e.day,
        e.event_name,
        e.props,
        e.referrer_source,
        e.geo_country,
        e.geo_region,
        vn.nickname AS locked_nickname,
        vn.show_title AS locked_show_title,
        vn.avatar_url AS locked_avatar_url,
        vn.character_id AS locked_character_id
      FROM analytics_events e
      LEFT JOIN visitor_nicknames vn ON vn.visitor_id = e.visitor_id
      WHERE e.created_at >= now() - interval '120 seconds'
        AND e.visitor_id IS NOT NULL
        AND e.audience = 'internal'
        AND e.event_name = 'visitor_presence'
      ORDER BY e.visitor_id, e.created_at DESC
    `) as RawRow[];
  } else if (audience === "all") {
    rows = (await sql`
      SELECT DISTINCT ON (e.visitor_id)
        e.visitor_id,
        e.session_id,
        e.audience,
        e.created_at,
        e.path,
        e.day,
        e.event_name,
        e.props,
        e.referrer_source,
        e.geo_country,
        e.geo_region,
        vn.nickname AS locked_nickname,
        vn.show_title AS locked_show_title,
        vn.avatar_url AS locked_avatar_url,
        vn.character_id AS locked_character_id
      FROM analytics_events e
      LEFT JOIN visitor_nicknames vn ON vn.visitor_id = e.visitor_id
      WHERE e.created_at >= now() - interval '120 seconds'
        AND e.visitor_id IS NOT NULL
        AND e.event_name = 'visitor_presence'
      ORDER BY e.visitor_id, e.created_at DESC
    `) as RawRow[];
  } else {
    rows = (await sql`
      SELECT DISTINCT ON (e.visitor_id)
        e.visitor_id,
        e.session_id,
        e.audience,
        e.created_at,
        e.path,
        e.day,
        e.event_name,
        e.props,
        e.referrer_source,
        e.geo_country,
        e.geo_region,
        vn.nickname AS locked_nickname,
        vn.show_title AS locked_show_title,
        vn.avatar_url AS locked_avatar_url,
        vn.character_id AS locked_character_id
      FROM analytics_events e
      LEFT JOIN visitor_nicknames vn ON vn.visitor_id = e.visitor_id
      WHERE e.created_at >= now() - interval '120 seconds'
        AND e.visitor_id IS NOT NULL
        AND e.audience = 'visitor'
        AND e.event_name = 'visitor_presence'
      ORDER BY e.visitor_id, e.created_at DESC
    `) as RawRow[];
  }

  const now = Date.now();

  const visitors: LiveVisitorRow[] = rows.map((row) => {
    const at = new Date(row.created_at).getTime();
    const props = parseProps(row.props);
    const display = resolveDisplayIdentity({
      nickname: row.locked_nickname,
      show_title: row.locked_show_title,
      avatar_url: row.locked_avatar_url,
      character_id: row.locked_character_id,
    });
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
      lockedNickname: display.nickname,
      lockedShowTitle: display.showTitle,
      lockedAvatarUrl: display.avatarUrl,
    };
  });

  visitors.sort((a, b) => a.secondsAgo - b.secondsAgo);
  const listeners = visitors.filter((v) => isListeningActivity(v.activity));

  return {
    generatedAt: new Date().toISOString(),
    windowSeconds,
    activeCount: visitors.length,
    listeningCount: listeners.length,
    visitors,
    listeners,
    dbConfigured: true,
    hint:
      "Active = visitor_presence in the last 2 minutes (10s while listening). Listen totals use beat_listen chunks + final flush.",
  };
}
