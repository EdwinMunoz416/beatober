import { getSql } from "@/lib/db";

export type MetricsAudience = "visitor" | "internal" | "all";

export type AdminMetrics = {
  generatedAt: string;
  audienceFilter: MetricsAudience;
  windows: {
    hours24: WindowStats;
    days7: WindowStats;
  };
  byDay: DayMetric[];
  recent: RecentEvent[];
  compareNote: string;
};

export type WindowStats = {
  totalEvents: number;
  uniqueVisitors: number;
  pageViews: number;
  dayViews: number;
  beatPlays: number;
  strudelPlays: number;
  lockedTaps: number;
};

export type DayMetric = {
  day: number;
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
  page_views: number;
  day_views: number;
  beat_plays: number;
  strudel_plays: number;
  locked_taps: number;
};

async function window24(sql: ReturnType<typeof getSql>, audience: MetricsAudience) {
  if (audience === "internal") {
    return sql`
      SELECT COUNT(*)::int AS total_events,
        COUNT(DISTINCT visitor_id)::int AS unique_visitors,
        COUNT(*) FILTER (WHERE event_name IN ('page_view'))::int AS page_views,
        COUNT(*) FILTER (WHERE event_name IN ('day_view', 'day_select'))::int AS day_views,
        COUNT(*) FILTER (WHERE event_name IN ('play_beat', 'beat_play'))::int AS beat_plays,
        COUNT(*) FILTER (WHERE event_name = 'strudel_play')::int AS strudel_plays,
        COUNT(*) FILTER (WHERE event_name = 'day_locked_interaction')::int AS locked_taps
      FROM analytics_events
      WHERE created_at >= now() - interval '24 hours' AND audience = 'internal'
    `;
  }
  if (audience === "all") {
    return sql`
      SELECT COUNT(*)::int AS total_events,
        COUNT(DISTINCT visitor_id)::int AS unique_visitors,
        COUNT(*) FILTER (WHERE event_name IN ('page_view'))::int AS page_views,
        COUNT(*) FILTER (WHERE event_name IN ('day_view', 'day_select'))::int AS day_views,
        COUNT(*) FILTER (WHERE event_name IN ('play_beat', 'beat_play'))::int AS beat_plays,
        COUNT(*) FILTER (WHERE event_name = 'strudel_play')::int AS strudel_plays,
        COUNT(*) FILTER (WHERE event_name = 'day_locked_interaction')::int AS locked_taps
      FROM analytics_events
      WHERE created_at >= now() - interval '24 hours'
    `;
  }
  return sql`
    SELECT COUNT(*)::int AS total_events,
      COUNT(DISTINCT visitor_id)::int AS unique_visitors,
      COUNT(*) FILTER (WHERE event_name IN ('page_view'))::int AS page_views,
      COUNT(*) FILTER (WHERE event_name IN ('day_view', 'day_select'))::int AS day_views,
      COUNT(*) FILTER (WHERE event_name IN ('play_beat', 'beat_play'))::int AS beat_plays,
      COUNT(*) FILTER (WHERE event_name = 'strudel_play')::int AS strudel_plays,
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
        COUNT(*) FILTER (WHERE event_name IN ('page_view'))::int AS page_views,
        COUNT(*) FILTER (WHERE event_name IN ('day_view', 'day_select'))::int AS day_views,
        COUNT(*) FILTER (WHERE event_name IN ('play_beat', 'beat_play'))::int AS beat_plays,
        COUNT(*) FILTER (WHERE event_name = 'strudel_play')::int AS strudel_plays,
        COUNT(*) FILTER (WHERE event_name = 'day_locked_interaction')::int AS locked_taps
      FROM analytics_events
      WHERE created_at >= now() - interval '7 days' AND audience = 'internal'
    `;
  }
  if (audience === "all") {
    return sql`
      SELECT COUNT(*)::int AS total_events,
        COUNT(DISTINCT visitor_id)::int AS unique_visitors,
        COUNT(*) FILTER (WHERE event_name IN ('page_view'))::int AS page_views,
        COUNT(*) FILTER (WHERE event_name IN ('day_view', 'day_select'))::int AS day_views,
        COUNT(*) FILTER (WHERE event_name IN ('play_beat', 'beat_play'))::int AS beat_plays,
        COUNT(*) FILTER (WHERE event_name = 'strudel_play')::int AS strudel_plays,
        COUNT(*) FILTER (WHERE event_name = 'day_locked_interaction')::int AS locked_taps
      FROM analytics_events
      WHERE created_at >= now() - interval '7 days'
    `;
  }
  return sql`
    SELECT COUNT(*)::int AS total_events,
      COUNT(DISTINCT visitor_id)::int AS unique_visitors,
      COUNT(*) FILTER (WHERE event_name IN ('page_view'))::int AS page_views,
      COUNT(*) FILTER (WHERE event_name IN ('day_view', 'day_select'))::int AS day_views,
      COUNT(*) FILTER (WHERE event_name IN ('play_beat', 'beat_play'))::int AS beat_plays,
      COUNT(*) FILTER (WHERE event_name = 'strudel_play')::int AS strudel_plays,
      COUNT(*) FILTER (WHERE event_name = 'day_locked_interaction')::int AS locked_taps
    FROM analytics_events
    WHERE created_at >= now() - interval '7 days' AND audience = 'visitor'
  `;
}

export async function fetchAdminMetrics(
  audience: MetricsAudience = "visitor",
): Promise<AdminMetrics> {
  const sql = getSql();

  const w24rows = (await window24(sql, audience)) as WindowRow[];
  const w7rows = (await window7(sql, audience)) as WindowRow[];

  let byDay: {
    day: number;
    day_views: number;
    beat_plays: number;
    strudel_plays: number;
  }[];

  if (audience === "internal") {
    byDay = (await sql`
      SELECT day,
        COUNT(*) FILTER (WHERE event_name IN ('day_view', 'day_select'))::int AS day_views,
        COUNT(*) FILTER (WHERE event_name IN ('play_beat', 'beat_play'))::int AS beat_plays,
        COUNT(*) FILTER (WHERE event_name = 'strudel_play')::int AS strudel_plays
      FROM analytics_events
      WHERE day IS NOT NULL AND created_at >= now() - interval '7 days' AND audience = 'internal'
      GROUP BY day ORDER BY day
    `) as typeof byDay;
  } else if (audience === "all") {
    byDay = (await sql`
      SELECT day,
        COUNT(*) FILTER (WHERE event_name IN ('day_view', 'day_select'))::int AS day_views,
        COUNT(*) FILTER (WHERE event_name IN ('play_beat', 'beat_play'))::int AS beat_plays,
        COUNT(*) FILTER (WHERE event_name = 'strudel_play')::int AS strudel_plays
      FROM analytics_events
      WHERE day IS NOT NULL AND created_at >= now() - interval '7 days'
      GROUP BY day ORDER BY day
    `) as typeof byDay;
  } else {
    byDay = (await sql`
      SELECT day,
        COUNT(*) FILTER (WHERE event_name IN ('day_view', 'day_select'))::int AS day_views,
        COUNT(*) FILTER (WHERE event_name IN ('play_beat', 'beat_play'))::int AS beat_plays,
        COUNT(*) FILTER (WHERE event_name = 'strudel_play')::int AS strudel_plays
      FROM analytics_events
      WHERE day IS NOT NULL AND created_at >= now() - interval '7 days' AND audience = 'visitor'
      GROUP BY day ORDER BY day
    `) as typeof byDay;
  }

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

  const mapWindow = (row: WindowRow | undefined): WindowStats => ({
    totalEvents: row?.total_events ?? 0,
    uniqueVisitors: row?.unique_visitors ?? 0,
    pageViews: row?.page_views ?? 0,
    dayViews: row?.day_views ?? 0,
    beatPlays: row?.beat_plays ?? 0,
    strudelPlays: row?.strudel_plays ?? 0,
    lockedTaps: row?.locked_taps ?? 0,
  });

  const audienceNote =
    audience === "visitor"
      ? "Showing visitors only (internal/ignore excluded)."
      : audience === "internal"
        ? "Showing internal devices only."
        : "Showing all stored events.";

  return {
    generatedAt: new Date().toISOString(),
    audienceFilter: audience,
    windows: {
      hours24: mapWindow(w24rows[0]),
      days7: mapWindow(w7rows[0]),
    },
    byDay: byDay.map((r) => ({
      day: r.day,
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
    compareNote: `${audienceNote} Vercel Hobby Analytics is separate (client skips ignore/author/admin paths).`,
  };
}
