import { BEATOBER_TIMEZONE } from "@/lib/day-access";
import {
  fetchGeoMetrics7d,
  type GeoMetrics7d,
} from "@/lib/analytics-geo-metrics";
import {
  fetchVisitorProfiles,
  type VisitorProfile,
} from "@/lib/analytics-visitor-profiles";
import { getSql } from "@/lib/db";

export type { GeoMetrics7d };

export type { VisitorProfile };

export type MetricsAudience = "visitor" | "internal" | "all";

export type AdminMetrics = {
  generatedAt: string;
  audienceFilter: MetricsAudience;
  windows: {
    hours24: WindowStats;
    days7: WindowStats;
  };
  funnel7d: VisitorFunnel;
  shareLandings7d: ShareLandingRow[];
  referrer7d: ReferrerRow[];
  trafficSources7d: TrafficSourceRow[];
  firstTouchSources7d: FirstTouchSourceRow[];
  dailyReach7d: DailyReachRow[];
  byDay: DayMetric[];
  recent: RecentEvent[];
  visitors: VisitorProfile[];
  geo7d: GeoMetrics7d;
  compareNote: string;
};

export type WindowStats = {
  totalEvents: number;
  uniqueVisitors: number;
  uniqueSessions: number;
  siteVisitors: number;
  visitorsWithDayView: number;
  visitorsWithBeatPlay: number;
  pageViews: number;
  dayViews: number;
  beatPlays: number;
  strudelPlays: number;
  lockedTaps: number;
};

export type VisitorFunnel = {
  siteVisitors: number;
  dayViewVisitors: number;
  beatPlayVisitors: number;
  listen30sVisitors: number;
  loopCompleteVisitors: number;
  shareLandingSessions: number;
};

export type ShareLandingRow = {
  day: number;
  uniqueVisitors: number;
  landingCount: number;
};

export type ReferrerRow = {
  bucket: string;
  uniqueVisitors: number;
};

export type TrafficSourceRow = {
  source: string;
  uniqueVisitors: number;
  pageViews: number;
};

export type FirstTouchSourceRow = {
  source: string;
  uniqueVisitors: number;
};

export type DailyReachRow = {
  date: string;
  uniqueVisitors: number;
};

export type DayMetric = {
  day: number;
  uniqueViewers: number;
  uniquePlayers: number;
  dayViews: number;
  beatPlays: number;
  strudelPlays: number;
};

export type RecentEvent = {
  at: string;
  eventName: string;
  day: number | null;
  visitorId: string | null;
  referrerBucket: string | null;
  audience: string | null;
};

type WindowRow = {
  total_events: number;
  unique_visitors: number;
  unique_sessions: number;
  site_visitors: number;
  visitors_day_view: number;
  visitors_beat_play: number;
  page_views: number;
  day_views: number;
  beat_plays: number;
  strudel_plays: number;
  locked_taps: number;
};

type ByDayRow = {
  day: number;
  unique_viewers: number;
  unique_players: number;
  day_views: number;
  beat_plays: number;
  strudel_plays: number;
};

async function window24(sql: ReturnType<typeof getSql>, audience: MetricsAudience) {
  if (audience === "internal") {
    return sql`
      SELECT COUNT(*)::int AS total_events,
        COUNT(DISTINCT visitor_id)::int AS unique_visitors,
        COUNT(DISTINCT session_id)::int AS unique_sessions,
        COUNT(DISTINCT visitor_id) FILTER (WHERE event_name = 'page_view')::int AS site_visitors,
        COUNT(DISTINCT visitor_id) FILTER (WHERE event_name IN ('day_view', 'day_select'))::int AS visitors_day_view,
        COUNT(DISTINCT visitor_id) FILTER (WHERE event_name IN ('beat_play', 'play_beat', 'strudel_play'))::int AS visitors_beat_play,
        COUNT(*) FILTER (WHERE event_name IN ('page_view'))::int AS page_views,
        COUNT(*) FILTER (WHERE event_name IN ('day_view', 'day_select'))::int AS day_views,
        COUNT(*) FILTER (WHERE event_name IN ('beat_play', 'play_beat', 'strudel_play'))::int AS beat_plays,
        COUNT(*) FILTER (WHERE event_name = 'strudel_play' OR (event_name = 'beat_play' AND props->>'medium' = 'strudel'))::int AS strudel_plays,
        COUNT(*) FILTER (WHERE event_name = 'day_locked_interaction')::int AS locked_taps
      FROM analytics_events
      WHERE created_at >= now() - interval '24 hours' AND audience = 'internal'
    `;
  }
  if (audience === "all") {
    return sql`
      SELECT COUNT(*)::int AS total_events,
        COUNT(DISTINCT visitor_id)::int AS unique_visitors,
        COUNT(DISTINCT session_id)::int AS unique_sessions,
        COUNT(DISTINCT visitor_id) FILTER (WHERE event_name = 'page_view')::int AS site_visitors,
        COUNT(DISTINCT visitor_id) FILTER (WHERE event_name IN ('day_view', 'day_select'))::int AS visitors_day_view,
        COUNT(DISTINCT visitor_id) FILTER (WHERE event_name IN ('beat_play', 'play_beat', 'strudel_play'))::int AS visitors_beat_play,
        COUNT(*) FILTER (WHERE event_name IN ('page_view'))::int AS page_views,
        COUNT(*) FILTER (WHERE event_name IN ('day_view', 'day_select'))::int AS day_views,
        COUNT(*) FILTER (WHERE event_name IN ('beat_play', 'play_beat', 'strudel_play'))::int AS beat_plays,
        COUNT(*) FILTER (WHERE event_name = 'strudel_play' OR (event_name = 'beat_play' AND props->>'medium' = 'strudel'))::int AS strudel_plays,
        COUNT(*) FILTER (WHERE event_name = 'day_locked_interaction')::int AS locked_taps
      FROM analytics_events
      WHERE created_at >= now() - interval '24 hours'
    `;
  }
  return sql`
    SELECT COUNT(*)::int AS total_events,
      COUNT(DISTINCT visitor_id)::int AS unique_visitors,
      COUNT(DISTINCT session_id)::int AS unique_sessions,
      COUNT(DISTINCT visitor_id) FILTER (WHERE event_name = 'page_view')::int AS site_visitors,
      COUNT(DISTINCT visitor_id) FILTER (WHERE event_name IN ('day_view', 'day_select'))::int AS visitors_day_view,
      COUNT(DISTINCT visitor_id) FILTER (WHERE event_name IN ('beat_play', 'play_beat', 'strudel_play'))::int AS visitors_beat_play,
      COUNT(*) FILTER (WHERE event_name IN ('page_view'))::int AS page_views,
      COUNT(*) FILTER (WHERE event_name IN ('day_view', 'day_select'))::int AS day_views,
      COUNT(*) FILTER (WHERE event_name IN ('beat_play', 'play_beat', 'strudel_play'))::int AS beat_plays,
      COUNT(*) FILTER (WHERE event_name = 'strudel_play' OR (event_name = 'beat_play' AND props->>'medium' = 'strudel'))::int AS strudel_plays,
      COUNT(*) FILTER (WHERE event_name = 'day_locked_interaction')::int AS locked_taps
    FROM analytics_events
    WHERE created_at >= now() - interval '24 hours' AND audience = 'visitor'
  `;
}

async function window7(sql: ReturnType<typeof getSql>, audience: MetricsAudience) {
  if (audience === "internal") {
    return sql`
      SELECT COUNT(*)::int AS total_events,
        COUNT(DISTINCT visitor_id)::int AS unique_visitors,
        COUNT(DISTINCT session_id)::int AS unique_sessions,
        COUNT(DISTINCT visitor_id) FILTER (WHERE event_name = 'page_view')::int AS site_visitors,
        COUNT(DISTINCT visitor_id) FILTER (WHERE event_name IN ('day_view', 'day_select'))::int AS visitors_day_view,
        COUNT(DISTINCT visitor_id) FILTER (WHERE event_name IN ('beat_play', 'play_beat', 'strudel_play'))::int AS visitors_beat_play,
        COUNT(*) FILTER (WHERE event_name IN ('page_view'))::int AS page_views,
        COUNT(*) FILTER (WHERE event_name IN ('day_view', 'day_select'))::int AS day_views,
        COUNT(*) FILTER (WHERE event_name IN ('beat_play', 'play_beat', 'strudel_play'))::int AS beat_plays,
        COUNT(*) FILTER (WHERE event_name = 'strudel_play' OR (event_name = 'beat_play' AND props->>'medium' = 'strudel'))::int AS strudel_plays,
        COUNT(*) FILTER (WHERE event_name = 'day_locked_interaction')::int AS locked_taps
      FROM analytics_events
      WHERE created_at >= now() - interval '7 days' AND audience = 'internal'
    `;
  }
  if (audience === "all") {
    return sql`
      SELECT COUNT(*)::int AS total_events,
        COUNT(DISTINCT visitor_id)::int AS unique_visitors,
        COUNT(DISTINCT session_id)::int AS unique_sessions,
        COUNT(DISTINCT visitor_id) FILTER (WHERE event_name = 'page_view')::int AS site_visitors,
        COUNT(DISTINCT visitor_id) FILTER (WHERE event_name IN ('day_view', 'day_select'))::int AS visitors_day_view,
        COUNT(DISTINCT visitor_id) FILTER (WHERE event_name IN ('beat_play', 'play_beat', 'strudel_play'))::int AS visitors_beat_play,
        COUNT(*) FILTER (WHERE event_name IN ('page_view'))::int AS page_views,
        COUNT(*) FILTER (WHERE event_name IN ('day_view', 'day_select'))::int AS day_views,
        COUNT(*) FILTER (WHERE event_name IN ('beat_play', 'play_beat', 'strudel_play'))::int AS beat_plays,
        COUNT(*) FILTER (WHERE event_name = 'strudel_play' OR (event_name = 'beat_play' AND props->>'medium' = 'strudel'))::int AS strudel_plays,
        COUNT(*) FILTER (WHERE event_name = 'day_locked_interaction')::int AS locked_taps
      FROM analytics_events
      WHERE created_at >= now() - interval '7 days'
    `;
  }
  return sql`
    SELECT COUNT(*)::int AS total_events,
      COUNT(DISTINCT visitor_id)::int AS unique_visitors,
      COUNT(DISTINCT session_id)::int AS unique_sessions,
      COUNT(DISTINCT visitor_id) FILTER (WHERE event_name = 'page_view')::int AS site_visitors,
      COUNT(DISTINCT visitor_id) FILTER (WHERE event_name IN ('day_view', 'day_select'))::int AS visitors_day_view,
      COUNT(DISTINCT visitor_id) FILTER (WHERE event_name IN ('beat_play', 'play_beat', 'strudel_play'))::int AS visitors_beat_play,
      COUNT(*) FILTER (WHERE event_name IN ('page_view'))::int AS page_views,
      COUNT(*) FILTER (WHERE event_name IN ('day_view', 'day_select'))::int AS day_views,
      COUNT(*) FILTER (WHERE event_name IN ('beat_play', 'play_beat', 'strudel_play'))::int AS beat_plays,
      COUNT(*) FILTER (WHERE event_name = 'strudel_play' OR (event_name = 'beat_play' AND props->>'medium' = 'strudel'))::int AS strudel_plays,
      COUNT(*) FILTER (WHERE event_name = 'day_locked_interaction')::int AS locked_taps
    FROM analytics_events
    WHERE created_at >= now() - interval '7 days' AND audience = 'visitor'
  `;
}

async function queryByDay(sql: ReturnType<typeof getSql>, audience: MetricsAudience) {
  if (audience === "internal") {
    return sql`
      SELECT day,
        COUNT(DISTINCT visitor_id) FILTER (WHERE event_name IN ('day_view', 'day_select'))::int AS unique_viewers,
        COUNT(DISTINCT visitor_id) FILTER (WHERE event_name IN ('beat_play', 'play_beat', 'strudel_play'))::int AS unique_players,
        COUNT(*) FILTER (WHERE event_name IN ('day_view', 'day_select'))::int AS day_views,
        COUNT(*) FILTER (WHERE event_name IN ('beat_play', 'play_beat', 'strudel_play'))::int AS beat_plays,
        COUNT(*) FILTER (WHERE event_name = 'strudel_play' OR (event_name = 'beat_play' AND props->>'medium' = 'strudel'))::int AS strudel_plays
      FROM analytics_events
      WHERE day IS NOT NULL AND created_at >= now() - interval '7 days' AND audience = 'internal'
      GROUP BY day ORDER BY day
    `;
  }
  if (audience === "all") {
    return sql`
      SELECT day,
        COUNT(DISTINCT visitor_id) FILTER (WHERE event_name IN ('day_view', 'day_select'))::int AS unique_viewers,
        COUNT(DISTINCT visitor_id) FILTER (WHERE event_name IN ('beat_play', 'play_beat', 'strudel_play'))::int AS unique_players,
        COUNT(*) FILTER (WHERE event_name IN ('day_view', 'day_select'))::int AS day_views,
        COUNT(*) FILTER (WHERE event_name IN ('beat_play', 'play_beat', 'strudel_play'))::int AS beat_plays,
        COUNT(*) FILTER (WHERE event_name = 'strudel_play' OR (event_name = 'beat_play' AND props->>'medium' = 'strudel'))::int AS strudel_plays
      FROM analytics_events
      WHERE day IS NOT NULL AND created_at >= now() - interval '7 days'
      GROUP BY day ORDER BY day
    `;
  }
  return sql`
    SELECT day,
      COUNT(DISTINCT visitor_id) FILTER (WHERE event_name IN ('day_view', 'day_select'))::int AS unique_viewers,
      COUNT(DISTINCT visitor_id) FILTER (WHERE event_name IN ('beat_play', 'play_beat', 'strudel_play'))::int AS unique_players,
      COUNT(*) FILTER (WHERE event_name IN ('day_view', 'day_select'))::int AS day_views,
      COUNT(*) FILTER (WHERE event_name IN ('beat_play', 'play_beat', 'strudel_play'))::int AS beat_plays,
      COUNT(*) FILTER (WHERE event_name = 'strudel_play' OR (event_name = 'beat_play' AND props->>'medium' = 'strudel'))::int AS strudel_plays
    FROM analytics_events
    WHERE day IS NOT NULL AND created_at >= now() - interval '7 days' AND audience = 'visitor'
    GROUP BY day ORDER BY day
  `;
}

async function queryTrafficSources7d(
  sql: ReturnType<typeof getSql>,
  audience: MetricsAudience,
) {
  if (audience === "internal") {
    return sql`
      SELECT COALESCE(
          NULLIF(referrer_source, ''),
          NULLIF(props->>'referrer_source', ''),
          NULLIF(referrer_bucket, ''),
          'direct'
        ) AS source,
        COUNT(DISTINCT visitor_id)::int AS unique_visitors,
        COUNT(*)::int AS page_views
      FROM analytics_events
      WHERE created_at >= now() - interval '7 days'
        AND event_name = 'page_view'
        AND audience = 'internal'
      GROUP BY 1
      ORDER BY unique_visitors DESC, page_views DESC
      LIMIT 24
    `;
  }
  if (audience === "all") {
    return sql`
      SELECT COALESCE(
          NULLIF(referrer_source, ''),
          NULLIF(props->>'referrer_source', ''),
          NULLIF(referrer_bucket, ''),
          'direct'
        ) AS source,
        COUNT(DISTINCT visitor_id)::int AS unique_visitors,
        COUNT(*)::int AS page_views
      FROM analytics_events
      WHERE created_at >= now() - interval '7 days'
        AND event_name = 'page_view'
      GROUP BY 1
      ORDER BY unique_visitors DESC, page_views DESC
      LIMIT 24
    `;
  }
  return sql`
    SELECT COALESCE(
        NULLIF(referrer_source, ''),
        NULLIF(props->>'referrer_source', ''),
        NULLIF(referrer_bucket, ''),
        'direct'
      ) AS source,
      COUNT(DISTINCT visitor_id)::int AS unique_visitors,
      COUNT(*)::int AS page_views
    FROM analytics_events
    WHERE created_at >= now() - interval '7 days'
      AND event_name = 'page_view'
      AND audience = 'visitor'
    GROUP BY 1
    ORDER BY unique_visitors DESC, page_views DESC
    LIMIT 24
  `;
}

async function queryFirstTouchSources7d(
  sql: ReturnType<typeof getSql>,
  audience: MetricsAudience,
) {
  if (audience === "internal") {
    return sql`
      SELECT source, COUNT(*)::int AS unique_visitors
      FROM (
        SELECT DISTINCT ON (visitor_id)
          visitor_id,
          COALESCE(
            NULLIF(referrer_source, ''),
            NULLIF(props->>'referrer_source', ''),
            NULLIF(referrer_bucket, ''),
            'direct'
          ) AS source
        FROM analytics_events
        WHERE created_at >= now() - interval '7 days'
          AND event_name = 'page_view'
          AND visitor_id IS NOT NULL
          AND audience = 'internal'
        ORDER BY visitor_id, created_at ASC
      ) first_touch
      GROUP BY source
      ORDER BY unique_visitors DESC, source ASC
      LIMIT 24
    `;
  }
  if (audience === "all") {
    return sql`
      SELECT source, COUNT(*)::int AS unique_visitors
      FROM (
        SELECT DISTINCT ON (visitor_id)
          visitor_id,
          COALESCE(
            NULLIF(referrer_source, ''),
            NULLIF(props->>'referrer_source', ''),
            NULLIF(referrer_bucket, ''),
            'direct'
          ) AS source
        FROM analytics_events
        WHERE created_at >= now() - interval '7 days'
          AND event_name = 'page_view'
          AND visitor_id IS NOT NULL
        ORDER BY visitor_id, created_at ASC
      ) first_touch
      GROUP BY source
      ORDER BY unique_visitors DESC, source ASC
      LIMIT 24
    `;
  }
  return sql`
    SELECT source, COUNT(*)::int AS unique_visitors
    FROM (
      SELECT DISTINCT ON (visitor_id)
        visitor_id,
        COALESCE(
          NULLIF(referrer_source, ''),
          NULLIF(props->>'referrer_source', ''),
          NULLIF(referrer_bucket, ''),
          'direct'
        ) AS source
      FROM analytics_events
      WHERE created_at >= now() - interval '7 days'
        AND event_name = 'page_view'
        AND visitor_id IS NOT NULL
        AND audience = 'visitor'
      ORDER BY visitor_id, created_at ASC
    ) first_touch
    GROUP BY source
    ORDER BY unique_visitors DESC, source ASC
    LIMIT 24
  `;
}

async function queryReferrer7d(
  sql: ReturnType<typeof getSql>,
  audience: MetricsAudience,
) {
  if (audience === "internal") {
    return sql`
      SELECT COALESCE(NULLIF(referrer_bucket, ''), 'direct') AS bucket,
        COUNT(DISTINCT visitor_id)::int AS unique_visitors
      FROM analytics_events
      WHERE created_at >= now() - interval '7 days'
        AND event_name = 'page_view'
        AND audience = 'internal'
      GROUP BY bucket
      ORDER BY unique_visitors DESC
    `;
  }
  if (audience === "all") {
    return sql`
      SELECT COALESCE(NULLIF(referrer_bucket, ''), 'direct') AS bucket,
        COUNT(DISTINCT visitor_id)::int AS unique_visitors
      FROM analytics_events
      WHERE created_at >= now() - interval '7 days'
        AND event_name = 'page_view'
      GROUP BY bucket
      ORDER BY unique_visitors DESC
    `;
  }
  return sql`
    SELECT COALESCE(NULLIF(referrer_bucket, ''), 'direct') AS bucket,
      COUNT(DISTINCT visitor_id)::int AS unique_visitors
    FROM analytics_events
    WHERE created_at >= now() - interval '7 days'
      AND event_name = 'page_view'
      AND audience = 'visitor'
    GROUP BY bucket
    ORDER BY unique_visitors DESC
  `;
}

async function queryFunnelExtended7d(
  sql: ReturnType<typeof getSql>,
  audience: MetricsAudience,
): Promise<{
  listen30s: number;
  loop_complete: number;
  share_sessions: number;
}> {
  type Row = {
    listen30s: number;
    loop_complete: number;
    share_sessions: number;
  };

  let rows: Row[];

  if (audience === "internal") {
    rows = (await sql`
      SELECT
        (
          SELECT COUNT(*)::int FROM (
            SELECT visitor_id
            FROM analytics_events
            WHERE created_at >= now() - interval '7 days'
              AND audience = 'internal'
              AND event_name = 'beat_listen'
              AND visitor_id IS NOT NULL
            GROUP BY visitor_id
            HAVING SUM(COALESCE((NULLIF(props->>'duration_ms', ''))::bigint, 0)) >= 30000
          ) listen30
        ) AS listen30s,
        (
          SELECT COUNT(DISTINCT visitor_id)::int
          FROM analytics_events
          WHERE created_at >= now() - interval '7 days'
            AND audience = 'internal'
            AND event_name = 'beat_loop_complete'
            AND visitor_id IS NOT NULL
        ) AS loop_complete,
        (
          SELECT COUNT(*)::int
          FROM analytics_events
          WHERE created_at >= now() - interval '7 days'
            AND audience = 'internal'
            AND event_name = 'share_landing'
        ) AS share_sessions
    `) as Row[];
  } else if (audience === "all") {
    rows = (await sql`
      SELECT
        (
          SELECT COUNT(*)::int FROM (
            SELECT visitor_id
            FROM analytics_events
            WHERE created_at >= now() - interval '7 days'
              AND event_name = 'beat_listen'
              AND visitor_id IS NOT NULL
            GROUP BY visitor_id
            HAVING SUM(COALESCE((NULLIF(props->>'duration_ms', ''))::bigint, 0)) >= 30000
          ) listen30
        ) AS listen30s,
        (
          SELECT COUNT(DISTINCT visitor_id)::int
          FROM analytics_events
          WHERE created_at >= now() - interval '7 days'
            AND event_name = 'beat_loop_complete'
            AND visitor_id IS NOT NULL
        ) AS loop_complete,
        (
          SELECT COUNT(*)::int
          FROM analytics_events
          WHERE created_at >= now() - interval '7 days'
            AND event_name = 'share_landing'
        ) AS share_sessions
    `) as Row[];
  } else {
    rows = (await sql`
      SELECT
        (
          SELECT COUNT(*)::int FROM (
            SELECT visitor_id
            FROM analytics_events
            WHERE created_at >= now() - interval '7 days'
              AND audience = 'visitor'
              AND event_name = 'beat_listen'
              AND visitor_id IS NOT NULL
            GROUP BY visitor_id
            HAVING SUM(COALESCE((NULLIF(props->>'duration_ms', ''))::bigint, 0)) >= 30000
          ) listen30
        ) AS listen30s,
        (
          SELECT COUNT(DISTINCT visitor_id)::int
          FROM analytics_events
          WHERE created_at >= now() - interval '7 days'
            AND audience = 'visitor'
            AND event_name = 'beat_loop_complete'
            AND visitor_id IS NOT NULL
        ) AS loop_complete,
        (
          SELECT COUNT(*)::int
          FROM analytics_events
          WHERE created_at >= now() - interval '7 days'
            AND audience = 'visitor'
            AND event_name = 'share_landing'
        ) AS share_sessions
    `) as Row[];
  }

  return rows[0] ?? { listen30s: 0, loop_complete: 0, share_sessions: 0 };
}

async function queryShareLandings7d(
  sql: ReturnType<typeof getSql>,
  audience: MetricsAudience,
) {
  if (audience === "internal") {
    return sql`
      SELECT day,
        COUNT(DISTINCT visitor_id)::int AS unique_visitors,
        COUNT(*)::int AS landing_count
      FROM analytics_events
      WHERE created_at >= now() - interval '7 days'
        AND event_name = 'share_landing'
        AND day IS NOT NULL
        AND audience = 'internal'
      GROUP BY day
      ORDER BY landing_count DESC, day ASC
    `;
  }
  if (audience === "all") {
    return sql`
      SELECT day,
        COUNT(DISTINCT visitor_id)::int AS unique_visitors,
        COUNT(*)::int AS landing_count
      FROM analytics_events
      WHERE created_at >= now() - interval '7 days'
        AND event_name = 'share_landing'
        AND day IS NOT NULL
      GROUP BY day
      ORDER BY landing_count DESC, day ASC
    `;
  }
  return sql`
    SELECT day,
      COUNT(DISTINCT visitor_id)::int AS unique_visitors,
      COUNT(*)::int AS landing_count
    FROM analytics_events
    WHERE created_at >= now() - interval '7 days'
      AND event_name = 'share_landing'
      AND day IS NOT NULL
      AND audience = 'visitor'
    GROUP BY day
    ORDER BY landing_count DESC, day ASC
  `;
}

async function queryDailyReach7d(
  sql: ReturnType<typeof getSql>,
  audience: MetricsAudience,
) {
  const tz = BEATOBER_TIMEZONE;
  if (audience === "internal") {
    return sql`
      SELECT (created_at AT TIME ZONE ${tz})::date AS day,
        COUNT(DISTINCT visitor_id)::int AS unique_visitors
      FROM analytics_events
      WHERE created_at >= now() - interval '7 days'
        AND audience = 'internal'
      GROUP BY 1
      ORDER BY 1
    `;
  }
  if (audience === "all") {
    return sql`
      SELECT (created_at AT TIME ZONE ${tz})::date AS day,
        COUNT(DISTINCT visitor_id)::int AS unique_visitors
      FROM analytics_events
      WHERE created_at >= now() - interval '7 days'
      GROUP BY 1
      ORDER BY 1
    `;
  }
  return sql`
    SELECT (created_at AT TIME ZONE ${tz})::date AS day,
      COUNT(DISTINCT visitor_id)::int AS unique_visitors
    FROM analytics_events
    WHERE created_at >= now() - interval '7 days'
      AND audience = 'visitor'
    GROUP BY 1
    ORDER BY 1
  `;
}

function mapWindow(row: WindowRow | undefined): WindowStats {
  return {
    totalEvents: row?.total_events ?? 0,
    uniqueVisitors: row?.unique_visitors ?? 0,
    uniqueSessions: row?.unique_sessions ?? 0,
    siteVisitors: row?.site_visitors ?? 0,
    visitorsWithDayView: row?.visitors_day_view ?? 0,
    visitorsWithBeatPlay: row?.visitors_beat_play ?? 0,
    pageViews: row?.page_views ?? 0,
    dayViews: row?.day_views ?? 0,
    beatPlays: row?.beat_plays ?? 0,
    strudelPlays: row?.strudel_plays ?? 0,
    lockedTaps: row?.locked_taps ?? 0,
  };
}

export async function fetchAdminMetrics(
  audience: MetricsAudience = "visitor",
): Promise<AdminMetrics> {
  const sql = getSql();

  const [
    w24rows,
    w7rows,
    byDayRows,
    referrerRows,
    trafficRows,
    firstTouchRows,
    dailyRows,
    funnelExt,
    shareRows,
    geo7d,
    visitors,
  ] = await Promise.all([
    window24(sql, audience) as Promise<WindowRow[]>,
    window7(sql, audience) as Promise<WindowRow[]>,
    queryByDay(sql, audience) as Promise<ByDayRow[]>,
    queryReferrer7d(sql, audience) as Promise<
      { bucket: string; unique_visitors: number }[]
    >,
    queryTrafficSources7d(sql, audience) as Promise<
      { source: string; unique_visitors: number; page_views: number }[]
    >,
    queryFirstTouchSources7d(sql, audience) as Promise<
      { source: string; unique_visitors: number }[]
    >,
    queryDailyReach7d(sql, audience) as Promise<
      { day: Date; unique_visitors: number }[]
    >,
    queryFunnelExtended7d(sql, audience),
    queryShareLandings7d(sql, audience) as Promise<
      { day: number; unique_visitors: number; landing_count: number }[]
    >,
    fetchGeoMetrics7d(audience),
    fetchVisitorProfiles(audience, 48),
  ]);

  let recent: {
    created_at: Date;
    event_name: string;
    day: number | null;
    visitor_id: string | null;
    referrer_bucket: string | null;
    audience: string | null;
  }[];

  if (audience === "internal") {
    recent = (await sql`
      SELECT created_at, event_name, day, visitor_id, referrer_bucket, audience
      FROM analytics_events WHERE audience = 'internal'
      ORDER BY created_at DESC LIMIT 40
    `) as typeof recent;
  } else if (audience === "all") {
    recent = (await sql`
      SELECT created_at, event_name, day, visitor_id, referrer_bucket, audience
      FROM analytics_events ORDER BY created_at DESC LIMIT 40
    `) as typeof recent;
  } else {
    recent = (await sql`
      SELECT created_at, event_name, day, visitor_id, referrer_bucket, audience
      FROM analytics_events WHERE audience = 'visitor'
      ORDER BY created_at DESC LIMIT 40
    `) as typeof recent;
  }

  const days7 = mapWindow(w7rows[0]);

  const audienceNote =
    audience === "visitor"
      ? "Showing visitors only (internal/ignore excluded). Unique visitor = browser id (localStorage), not a person."
      : audience === "internal"
        ? "Showing internal devices only."
        : "Showing all stored events.";

  return {
    generatedAt: new Date().toISOString(),
    audienceFilter: audience,
    windows: {
      hours24: mapWindow(w24rows[0]),
      days7,
    },
    funnel7d: {
      siteVisitors: days7.siteVisitors,
      dayViewVisitors: days7.visitorsWithDayView,
      beatPlayVisitors: days7.visitorsWithBeatPlay,
      listen30sVisitors: funnelExt.listen30s,
      loopCompleteVisitors: funnelExt.loop_complete,
      shareLandingSessions: funnelExt.share_sessions,
    },
    shareLandings7d: shareRows.map((r) => ({
      day: r.day,
      uniqueVisitors: r.unique_visitors,
      landingCount: r.landing_count,
    })),
    referrer7d: referrerRows.map((r) => ({
      bucket: r.bucket,
      uniqueVisitors: r.unique_visitors,
    })),
    trafficSources7d: trafficRows.map((r) => ({
      source: r.source,
      uniqueVisitors: r.unique_visitors,
      pageViews: r.page_views,
    })),
    firstTouchSources7d: firstTouchRows.map((r) => ({
      source: r.source,
      uniqueVisitors: r.unique_visitors,
    })),
    dailyReach7d: dailyRows.map((r) => ({
      date:
        r.day instanceof Date
          ? r.day.toISOString().slice(0, 10)
          : String(r.day).slice(0, 10),
      uniqueVisitors: r.unique_visitors,
    })),
    byDay: byDayRows.map((r) => ({
      day: r.day,
      uniqueViewers: r.unique_viewers,
      uniquePlayers: r.unique_players,
      dayViews: r.day_views,
      beatPlays: r.beat_plays,
      strudelPlays: r.strudel_plays,
    })),
    recent: recent.map((r) => ({
      at: new Date(r.created_at).toISOString(),
      eventName: r.event_name,
      day: r.day,
      visitorId: r.visitor_id ? `${r.visitor_id.slice(0, 8)}…` : null,
      referrerBucket: r.referrer_bucket,
      audience: r.audience,
    })),
    visitors,
    geo7d,
    compareNote: `${audienceNote} Geo = first page view per browser (Vercel edge country/region). Unknown geo is common in local dev. Vercel Hobby Analytics is separate.`,
  };
}
