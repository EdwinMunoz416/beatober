import { getSql } from "@/lib/db";
import { resolveDisplayIdentity } from "@/lib/visitor-identity-store";

type MetricsAudience = "visitor" | "internal" | "all";

export type VisitorProfile = {
  visitorId: string;
  displayId: string;
  audience: string;
  deviceLabel: string | null;
  deviceRole: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  sessions: number;
  /** Distinct calendar days with any event (7d window). */
  activeDays: number;
  eventCount: number;
  pageViews: number;
  postsTouched: number;
  days: number[];
  beatPlays: number;
  playedBeat: boolean;
  referrerBucket: string;
  lastReferrerBucket: string;
  referrerSource: string;
  lastReferrerSource: string;
  lastPath: string | null;
  beatLoopCompletes: number;
  patternErrors: number;
  shareLandings: number;
  isReturning: boolean;
  topDay: number | null;
  strudelPlays: number;
  audioPlays: number;
  beatListenMs: number;
  pageEngagementMs: number;
  lockedTaps: number;
  lockedScrolls: number;
  geoCountry: string | null;
  geoRegion: string | null;
  lastGeoCountry: string | null;
  lastGeoRegion: string | null;
  lockedNickname: string | null;
  lockedShowTitle: string | null;
  lockedAvatarUrl: string | null;
};

type ProfileRow = {
  visitor_id: string;
  audience: string;
  device_label: string | null;
  device_role: string | null;
  first_seen: Date;
  last_seen: Date;
  sessions: number;
  active_days: number;
  event_count: number;
  page_views: number;
  posts_touched: number;
  days_csv: string | null;
  beat_plays: number;
  referrer_bucket: string | null;
  last_referrer_bucket: string | null;
  referrer_source: string | null;
  last_referrer_source: string | null;
  last_path: string | null;
  beat_loop_completes: number;
  pattern_errors: number;
  share_landings: number;
  geo_country: string | null;
  geo_region: string | null;
  last_geo_country: string | null;
  last_geo_region: string | null;
  top_day: number | null;
  strudel_plays: number;
  audio_plays: number;
  beat_listen_ms: string | number | null;
  page_engagement_ms: string | number | null;
  locked_taps: number;
  locked_scrolls: number;
  locked_nickname: string | null;
  locked_show_title: string | null;
  locked_avatar_url: string | null;
  locked_character_id: string | null;
};

export async function fetchVisitorProfiles(
  audience: MetricsAudience = "visitor",
  limit = 48,
): Promise<VisitorProfile[]> {
  const sql = getSql();
  const cap = Math.min(Math.max(limit, 1), 100);

  let rows: ProfileRow[];

  if (audience === "internal") {
    rows = (await sql`
      SELECT
        e.visitor_id,
        e.audience,
        MAX(dr.label) AS device_label,
        MAX(dr.role) AS device_role,
        MAX(vn.nickname) AS locked_nickname,
        MAX(vn.show_title) AS locked_show_title,
        MAX(vn.avatar_url) AS locked_avatar_url,
        MAX(vn.character_id) AS locked_character_id,
        MIN(e.created_at) AS first_seen,
        MAX(e.created_at) AS last_seen,
        COUNT(DISTINCT e.session_id)::int AS sessions,
        COUNT(DISTINCT (e.created_at AT TIME ZONE 'UTC')::date)::int AS active_days,
        COUNT(*)::int AS event_count,
        COUNT(*) FILTER (WHERE e.event_name = 'page_view')::int AS page_views,
        COUNT(DISTINCT e.day) FILTER (WHERE e.day IS NOT NULL)::int AS posts_touched,
        STRING_AGG(DISTINCT e.day::text, ',' ORDER BY e.day::text) FILTER (WHERE e.day IS NOT NULL) AS days_csv,
        (
          SELECT sub.day::int
          FROM (
            SELECT e3.day, COUNT(*) AS c
            FROM analytics_events e3
            WHERE e3.visitor_id = e.visitor_id
              AND e3.created_at >= now() - interval '7 days'
              AND e3.day IS NOT NULL
              AND e3.audience = 'internal'
            GROUP BY e3.day
            ORDER BY c DESC, e3.day ASC
            LIMIT 1
          ) sub
        ) AS top_day,
        COUNT(*) FILTER (WHERE e.event_name IN ('beat_play', 'play_beat', 'strudel_play'))::int AS beat_plays,
        COUNT(*) FILTER (
          WHERE e.event_name = 'strudel_play'
            OR (e.event_name = 'beat_play' AND e.props->>'medium' = 'strudel')
        )::int AS strudel_plays,
        COUNT(*) FILTER (WHERE e.event_name = 'beat_play' AND e.props->>'medium' = 'audio')::int AS audio_plays,
        COALESCE(
          SUM((NULLIF(e.props->>'duration_ms', ''))::bigint)
            FILTER (WHERE e.event_name = 'beat_listen'),
          0
        )::bigint AS beat_listen_ms,
        COALESCE(
          SUM((NULLIF(e.props->>'duration_ms', ''))::bigint)
            FILTER (WHERE e.event_name = 'page_engagement'),
          0
        )::bigint AS page_engagement_ms,
        COUNT(*) FILTER (WHERE e.event_name = 'day_locked_interaction')::int AS locked_taps,
        COUNT(*) FILTER (WHERE e.event_name = 'locked_day_scroll')::int AS locked_scrolls,
        COUNT(*) FILTER (WHERE e.event_name = 'beat_loop_complete')::int AS beat_loop_completes,
        COUNT(*) FILTER (WHERE e.event_name = 'strudel_error')::int AS pattern_errors,
        COUNT(*) FILTER (WHERE e.event_name = 'share_landing')::int AS share_landings,
        (array_agg(e.referrer_bucket ORDER BY e.created_at ASC)
          FILTER (WHERE e.event_name = 'page_view' AND e.referrer_bucket IS NOT NULL))[1] AS referrer_bucket,
        (array_agg(e.referrer_bucket ORDER BY e.created_at DESC)
          FILTER (WHERE e.event_name = 'page_view' AND e.referrer_bucket IS NOT NULL))[1] AS last_referrer_bucket,
        (array_agg(
          COALESCE(NULLIF(e.referrer_source, ''), e.props->>'referrer_source', e.referrer_bucket, 'direct')
          ORDER BY e.created_at ASC
        ) FILTER (WHERE e.event_name = 'page_view'))[1] AS referrer_source,
        (array_agg(
          COALESCE(NULLIF(e.referrer_source, ''), e.props->>'referrer_source', e.referrer_bucket, 'direct')
          ORDER BY e.created_at DESC
        ) FILTER (WHERE e.event_name = 'page_view'))[1] AS last_referrer_source,
        (array_agg(e.geo_country ORDER BY e.created_at ASC)
          FILTER (WHERE e.event_name = 'page_view' AND e.geo_country IS NOT NULL))[1] AS geo_country,
        (array_agg(e.geo_region ORDER BY e.created_at ASC)
          FILTER (WHERE e.event_name = 'page_view' AND e.geo_region IS NOT NULL))[1] AS geo_region,
        (array_agg(e.geo_country ORDER BY e.created_at DESC)
          FILTER (WHERE e.event_name = 'page_view' AND e.geo_country IS NOT NULL))[1] AS last_geo_country,
        (array_agg(e.geo_region ORDER BY e.created_at DESC)
          FILTER (WHERE e.event_name = 'page_view' AND e.geo_region IS NOT NULL))[1] AS last_geo_region,
        (array_agg(e.path ORDER BY e.created_at DESC)
          FILTER (WHERE e.path IS NOT NULL))[1] AS last_path
      FROM analytics_events e
      LEFT JOIN device_registry dr ON dr.visitor_id = e.visitor_id
      LEFT JOIN visitor_nicknames vn ON vn.visitor_id = e.visitor_id
      WHERE e.visitor_id IS NOT NULL
        AND e.created_at >= now() - interval '7 days'
        AND e.audience = 'internal'
      GROUP BY e.visitor_id, e.audience
      ORDER BY MAX(e.created_at) DESC
      LIMIT ${cap}
    `) as ProfileRow[];
  } else if (audience === "all") {
    rows = (await sql`
      SELECT
        e.visitor_id,
        e.audience,
        MAX(dr.label) AS device_label,
        MAX(dr.role) AS device_role,
        MAX(vn.nickname) AS locked_nickname,
        MAX(vn.show_title) AS locked_show_title,
        MAX(vn.avatar_url) AS locked_avatar_url,
        MAX(vn.character_id) AS locked_character_id,
        MIN(e.created_at) AS first_seen,
        MAX(e.created_at) AS last_seen,
        COUNT(DISTINCT e.session_id)::int AS sessions,
        COUNT(DISTINCT (e.created_at AT TIME ZONE 'UTC')::date)::int AS active_days,
        COUNT(*)::int AS event_count,
        COUNT(*) FILTER (WHERE e.event_name = 'page_view')::int AS page_views,
        COUNT(DISTINCT e.day) FILTER (WHERE e.day IS NOT NULL)::int AS posts_touched,
        STRING_AGG(DISTINCT e.day::text, ',' ORDER BY e.day::text) FILTER (WHERE e.day IS NOT NULL) AS days_csv,
        (
          SELECT sub.day::int
          FROM (
            SELECT e3.day, COUNT(*) AS c
            FROM analytics_events e3
            WHERE e3.visitor_id = e.visitor_id
              AND e3.created_at >= now() - interval '7 days'
              AND e3.day IS NOT NULL
            GROUP BY e3.day
            ORDER BY c DESC, e3.day ASC
            LIMIT 1
          ) sub
        ) AS top_day,
        COUNT(*) FILTER (WHERE e.event_name IN ('beat_play', 'play_beat', 'strudel_play'))::int AS beat_plays,
        COUNT(*) FILTER (
          WHERE e.event_name = 'strudel_play'
            OR (e.event_name = 'beat_play' AND e.props->>'medium' = 'strudel')
        )::int AS strudel_plays,
        COUNT(*) FILTER (WHERE e.event_name = 'beat_play' AND e.props->>'medium' = 'audio')::int AS audio_plays,
        COALESCE(
          SUM((NULLIF(e.props->>'duration_ms', ''))::bigint)
            FILTER (WHERE e.event_name = 'beat_listen'),
          0
        )::bigint AS beat_listen_ms,
        COALESCE(
          SUM((NULLIF(e.props->>'duration_ms', ''))::bigint)
            FILTER (WHERE e.event_name = 'page_engagement'),
          0
        )::bigint AS page_engagement_ms,
        COUNT(*) FILTER (WHERE e.event_name = 'day_locked_interaction')::int AS locked_taps,
        COUNT(*) FILTER (WHERE e.event_name = 'locked_day_scroll')::int AS locked_scrolls,
        COUNT(*) FILTER (WHERE e.event_name = 'beat_loop_complete')::int AS beat_loop_completes,
        COUNT(*) FILTER (WHERE e.event_name = 'strudel_error')::int AS pattern_errors,
        COUNT(*) FILTER (WHERE e.event_name = 'share_landing')::int AS share_landings,
        (array_agg(e.referrer_bucket ORDER BY e.created_at ASC)
          FILTER (WHERE e.event_name = 'page_view' AND e.referrer_bucket IS NOT NULL))[1] AS referrer_bucket,
        (array_agg(e.referrer_bucket ORDER BY e.created_at DESC)
          FILTER (WHERE e.event_name = 'page_view' AND e.referrer_bucket IS NOT NULL))[1] AS last_referrer_bucket,
        (array_agg(
          COALESCE(NULLIF(e.referrer_source, ''), e.props->>'referrer_source', e.referrer_bucket, 'direct')
          ORDER BY e.created_at ASC
        ) FILTER (WHERE e.event_name = 'page_view'))[1] AS referrer_source,
        (array_agg(
          COALESCE(NULLIF(e.referrer_source, ''), e.props->>'referrer_source', e.referrer_bucket, 'direct')
          ORDER BY e.created_at DESC
        ) FILTER (WHERE e.event_name = 'page_view'))[1] AS last_referrer_source,
        (array_agg(e.geo_country ORDER BY e.created_at ASC)
          FILTER (WHERE e.event_name = 'page_view' AND e.geo_country IS NOT NULL))[1] AS geo_country,
        (array_agg(e.geo_region ORDER BY e.created_at ASC)
          FILTER (WHERE e.event_name = 'page_view' AND e.geo_region IS NOT NULL))[1] AS geo_region,
        (array_agg(e.geo_country ORDER BY e.created_at DESC)
          FILTER (WHERE e.event_name = 'page_view' AND e.geo_country IS NOT NULL))[1] AS last_geo_country,
        (array_agg(e.geo_region ORDER BY e.created_at DESC)
          FILTER (WHERE e.event_name = 'page_view' AND e.geo_region IS NOT NULL))[1] AS last_geo_region,
        (array_agg(e.path ORDER BY e.created_at DESC)
          FILTER (WHERE e.path IS NOT NULL))[1] AS last_path
      FROM analytics_events e
      LEFT JOIN device_registry dr ON dr.visitor_id = e.visitor_id
      LEFT JOIN visitor_nicknames vn ON vn.visitor_id = e.visitor_id
      WHERE e.visitor_id IS NOT NULL
        AND e.created_at >= now() - interval '7 days'
      GROUP BY e.visitor_id, e.audience
      ORDER BY MAX(e.created_at) DESC
      LIMIT ${cap}
    `) as ProfileRow[];
  } else {
    rows = (await sql`
      SELECT
        e.visitor_id,
        e.audience,
        MAX(dr.label) AS device_label,
        MAX(dr.role) AS device_role,
        MAX(vn.nickname) AS locked_nickname,
        MAX(vn.show_title) AS locked_show_title,
        MAX(vn.avatar_url) AS locked_avatar_url,
        MAX(vn.character_id) AS locked_character_id,
        MIN(e.created_at) AS first_seen,
        MAX(e.created_at) AS last_seen,
        COUNT(DISTINCT e.session_id)::int AS sessions,
        COUNT(DISTINCT (e.created_at AT TIME ZONE 'UTC')::date)::int AS active_days,
        COUNT(*)::int AS event_count,
        COUNT(*) FILTER (WHERE e.event_name = 'page_view')::int AS page_views,
        COUNT(DISTINCT e.day) FILTER (WHERE e.day IS NOT NULL)::int AS posts_touched,
        STRING_AGG(DISTINCT e.day::text, ',' ORDER BY e.day::text) FILTER (WHERE e.day IS NOT NULL) AS days_csv,
        (
          SELECT sub.day::int
          FROM (
            SELECT e3.day, COUNT(*) AS c
            FROM analytics_events e3
            WHERE e3.visitor_id = e.visitor_id
              AND e3.created_at >= now() - interval '7 days'
              AND e3.day IS NOT NULL
              AND e3.audience = 'visitor'
            GROUP BY e3.day
            ORDER BY c DESC, e3.day ASC
            LIMIT 1
          ) sub
        ) AS top_day,
        COUNT(*) FILTER (WHERE e.event_name IN ('beat_play', 'play_beat', 'strudel_play'))::int AS beat_plays,
        COUNT(*) FILTER (
          WHERE e.event_name = 'strudel_play'
            OR (e.event_name = 'beat_play' AND e.props->>'medium' = 'strudel')
        )::int AS strudel_plays,
        COUNT(*) FILTER (WHERE e.event_name = 'beat_play' AND e.props->>'medium' = 'audio')::int AS audio_plays,
        COALESCE(
          SUM((NULLIF(e.props->>'duration_ms', ''))::bigint)
            FILTER (WHERE e.event_name = 'beat_listen'),
          0
        )::bigint AS beat_listen_ms,
        COALESCE(
          SUM((NULLIF(e.props->>'duration_ms', ''))::bigint)
            FILTER (WHERE e.event_name = 'page_engagement'),
          0
        )::bigint AS page_engagement_ms,
        COUNT(*) FILTER (WHERE e.event_name = 'day_locked_interaction')::int AS locked_taps,
        COUNT(*) FILTER (WHERE e.event_name = 'locked_day_scroll')::int AS locked_scrolls,
        COUNT(*) FILTER (WHERE e.event_name = 'beat_loop_complete')::int AS beat_loop_completes,
        COUNT(*) FILTER (WHERE e.event_name = 'strudel_error')::int AS pattern_errors,
        COUNT(*) FILTER (WHERE e.event_name = 'share_landing')::int AS share_landings,
        (array_agg(e.referrer_bucket ORDER BY e.created_at ASC)
          FILTER (WHERE e.event_name = 'page_view' AND e.referrer_bucket IS NOT NULL))[1] AS referrer_bucket,
        (array_agg(e.referrer_bucket ORDER BY e.created_at DESC)
          FILTER (WHERE e.event_name = 'page_view' AND e.referrer_bucket IS NOT NULL))[1] AS last_referrer_bucket,
        (array_agg(
          COALESCE(NULLIF(e.referrer_source, ''), e.props->>'referrer_source', e.referrer_bucket, 'direct')
          ORDER BY e.created_at ASC
        ) FILTER (WHERE e.event_name = 'page_view'))[1] AS referrer_source,
        (array_agg(
          COALESCE(NULLIF(e.referrer_source, ''), e.props->>'referrer_source', e.referrer_bucket, 'direct')
          ORDER BY e.created_at DESC
        ) FILTER (WHERE e.event_name = 'page_view'))[1] AS last_referrer_source,
        (array_agg(e.geo_country ORDER BY e.created_at ASC)
          FILTER (WHERE e.event_name = 'page_view' AND e.geo_country IS NOT NULL))[1] AS geo_country,
        (array_agg(e.geo_region ORDER BY e.created_at ASC)
          FILTER (WHERE e.event_name = 'page_view' AND e.geo_region IS NOT NULL))[1] AS geo_region,
        (array_agg(e.geo_country ORDER BY e.created_at DESC)
          FILTER (WHERE e.event_name = 'page_view' AND e.geo_country IS NOT NULL))[1] AS last_geo_country,
        (array_agg(e.geo_region ORDER BY e.created_at DESC)
          FILTER (WHERE e.event_name = 'page_view' AND e.geo_region IS NOT NULL))[1] AS last_geo_region,
        (array_agg(e.path ORDER BY e.created_at DESC)
          FILTER (WHERE e.path IS NOT NULL))[1] AS last_path
      FROM analytics_events e
      LEFT JOIN device_registry dr ON dr.visitor_id = e.visitor_id
      LEFT JOIN visitor_nicknames vn ON vn.visitor_id = e.visitor_id
      WHERE e.visitor_id IS NOT NULL
        AND e.created_at >= now() - interval '7 days'
        AND e.audience = 'visitor'
      GROUP BY e.visitor_id, e.audience
      ORDER BY MAX(e.created_at) DESC
      LIMIT ${cap}
    `) as ProfileRow[];
  }

  return rows.map(mapProfile);
}

export type VisitorTimelineEvent = {
  at: string;
  eventName: string;
  day: number | null;
  path: string | null;
  referrerBucket: string | null;
  sessionId: string | null;
  sessionKey: string | null;
  medium: string | null;
  repeat: boolean | null;
  durationMs: number | null;
  reason: string | null;
  depthPct: number | null;
  loopIndex: number | null;
};

type TimelineRow = {
  created_at: Date;
  event_name: string;
  day: number | null;
  path: string | null;
  referrer_bucket: string | null;
  session_id: string | null;
  props: Record<string, unknown> | null;
};

export async function fetchVisitorTimeline(
  visitorId: string,
  audience: MetricsAudience = "visitor",
  limit = 150,
): Promise<VisitorTimelineEvent[]> {
  const sql = getSql();
  const id = visitorId.trim().slice(0, 64);
  const cap = Math.min(Math.max(limit, 1), 300);

  let rows: TimelineRow[];

  if (audience === "internal") {
    rows = (await sql`
      SELECT created_at, event_name, day, path, referrer_bucket, session_id, props
      FROM analytics_events
      WHERE visitor_id = ${id}
        AND audience = 'internal'
        AND created_at >= now() - interval '30 days'
      ORDER BY created_at DESC
      LIMIT ${cap}
    `) as TimelineRow[];
  } else if (audience === "all") {
    rows = (await sql`
      SELECT created_at, event_name, day, path, referrer_bucket, session_id, props
      FROM analytics_events
      WHERE visitor_id = ${id}
        AND created_at >= now() - interval '30 days'
      ORDER BY created_at DESC
      LIMIT ${cap}
    `) as TimelineRow[];
  } else {
    rows = (await sql`
      SELECT created_at, event_name, day, path, referrer_bucket, session_id, props
      FROM analytics_events
      WHERE visitor_id = ${id}
        AND audience = 'visitor'
        AND created_at >= now() - interval '30 days'
      ORDER BY created_at DESC
      LIMIT ${cap}
    `) as TimelineRow[];
  }

  return rows.map(mapTimelineEvent);
}

function readProp(props: Record<string, unknown> | null, key: string): unknown {
  if (!props || typeof props !== "object") return undefined;
  return props[key];
}

function readDurationMs(props: Record<string, unknown> | null): number | null {
  const v = readProp(props, "duration_ms");
  if (typeof v === "number" && Number.isFinite(v)) return Math.round(v);
  if (typeof v === "string" && v.trim()) {
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function mapTimelineEvent(row: TimelineRow): VisitorTimelineEvent {
  let props = row.props;
  if (typeof props === "string") {
    try {
      props = JSON.parse(props) as Record<string, unknown>;
    } catch {
      props = null;
    }
  }
  const medium = readProp(props, "medium");
  const repeat = readProp(props, "repeat");
  const reason = readProp(props, "reason");
  const depth = readProp(props, "depth_pct");
  const loop = readProp(props, "loop");
  const sessionKey =
    typeof row.session_id === "string" ? row.session_id : null;
  return {
    at: new Date(row.created_at).toISOString(),
    eventName: row.event_name,
    day: row.day,
    path: row.path,
    referrerBucket: row.referrer_bucket,
    sessionId: sessionKey ? `${sessionKey.slice(0, 8)}…` : null,
    sessionKey,
    medium: typeof medium === "string" ? medium : null,
    repeat: typeof repeat === "boolean" ? repeat : null,
    durationMs: readDurationMs(props),
    reason: typeof reason === "string" ? reason : null,
    depthPct:
      typeof depth === "number"
        ? depth
        : typeof depth === "string"
          ? Number.parseInt(depth, 10) || null
          : null,
    loopIndex:
      typeof loop === "number"
        ? loop
        : typeof loop === "string"
          ? Number.parseInt(loop, 10) || null
          : null,
  };
}

function toMs(value: string | number | null | undefined): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  const n = Number.parseInt(String(value), 10);
  return Number.isFinite(n) ? n : 0;
}

function mapProfile(row: ProfileRow): VisitorProfile {
  const days = row.days_csv
    ? row.days_csv
        .split(",")
        .map((s) => Number.parseInt(s, 10))
        .filter((n) => Number.isFinite(n))
    : [];

  const spanMs =
    new Date(row.last_seen).getTime() - new Date(row.first_seen).getTime();

  const display = resolveDisplayIdentity({
    nickname: row.locked_nickname,
    show_title: row.locked_show_title,
    avatar_url: row.locked_avatar_url,
    character_id: row.locked_character_id,
  });

  return {
    visitorId: row.visitor_id,
    displayId: `${row.visitor_id.slice(0, 8)}…`,
    audience: row.audience,
    deviceLabel: row.device_label,
    deviceRole: row.device_role,
    firstSeenAt: new Date(row.first_seen).toISOString(),
    lastSeenAt: new Date(row.last_seen).toISOString(),
    sessions: row.sessions,
    activeDays: row.active_days ?? 1,
    eventCount: row.event_count ?? 0,
    pageViews: row.page_views,
    postsTouched: row.posts_touched,
    days,
    beatPlays: row.beat_plays,
    playedBeat: row.beat_plays > 0,
    referrerBucket: row.referrer_bucket ?? "direct",
    lastReferrerBucket: row.last_referrer_bucket ?? row.referrer_bucket ?? "direct",
    referrerSource: row.referrer_source ?? row.referrer_bucket ?? "direct",
    lastReferrerSource:
      row.last_referrer_source ??
      row.referrer_source ??
      row.last_referrer_bucket ??
      row.referrer_bucket ??
      "direct",
    lastPath: row.last_path,
    beatLoopCompletes: row.beat_loop_completes ?? 0,
    patternErrors: row.pattern_errors ?? 0,
    shareLandings: row.share_landings ?? 0,
    isReturning:
      (row.active_days ?? 1) >= 2 ||
      row.sessions >= 2 ||
      spanMs >= 86_400_000,
    topDay: row.top_day,
    strudelPlays: row.strudel_plays ?? 0,
    audioPlays: row.audio_plays ?? 0,
    beatListenMs: toMs(row.beat_listen_ms),
    pageEngagementMs: toMs(row.page_engagement_ms),
    lockedTaps: row.locked_taps ?? 0,
    lockedScrolls: row.locked_scrolls ?? 0,
    geoCountry: row.geo_country,
    geoRegion: row.geo_region,
    lastGeoCountry: row.last_geo_country,
    lastGeoRegion: row.last_geo_region,
    lockedNickname: display.nickname,
    lockedShowTitle: display.showTitle,
    lockedAvatarUrl: display.avatarUrl,
  };
}
