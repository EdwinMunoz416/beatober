import { getSql } from "@/lib/db";

export type AdminMetrics = {
  generatedAt: string;
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
};

export async function fetchAdminMetrics(): Promise<AdminMetrics> {
  const sql = getSql();

  const [w24] = await sql`
    SELECT
      COUNT(*)::int AS total_events,
      COUNT(DISTINCT visitor_id)::int AS unique_visitors,
      COUNT(*) FILTER (WHERE event_name IN ('page_view'))::int AS page_views,
      COUNT(*) FILTER (WHERE event_name IN ('day_view', 'day_select'))::int AS day_views,
      COUNT(*) FILTER (WHERE event_name IN ('play_beat', 'beat_play'))::int AS beat_plays,
      COUNT(*) FILTER (WHERE event_name = 'strudel_play')::int AS strudel_plays,
      COUNT(*) FILTER (WHERE event_name = 'day_locked_interaction')::int AS locked_taps
    FROM analytics_events
    WHERE created_at >= now() - interval '24 hours'
  `;

  const [w7] = await sql`
    SELECT
      COUNT(*)::int AS total_events,
      COUNT(DISTINCT visitor_id)::int AS unique_visitors,
      COUNT(*) FILTER (WHERE event_name IN ('page_view'))::int AS page_views,
      COUNT(*) FILTER (WHERE event_name IN ('day_view', 'day_select'))::int AS day_views,
      COUNT(*) FILTER (WHERE event_name IN ('play_beat', 'beat_play'))::int AS beat_plays,
      COUNT(*) FILTER (WHERE event_name = 'strudel_play')::int AS strudel_plays,
      COUNT(*) FILTER (WHERE event_name = 'day_locked_interaction')::int AS locked_taps
    FROM analytics_events
    WHERE created_at >= now() - interval '7 days'
  `;

  const byDay = (await sql`
    SELECT
      day,
      COUNT(*) FILTER (WHERE event_name IN ('day_view', 'day_select'))::int AS day_views,
      COUNT(*) FILTER (WHERE event_name IN ('play_beat', 'beat_play'))::int AS beat_plays,
      COUNT(*) FILTER (WHERE event_name = 'strudel_play')::int AS strudel_plays
    FROM analytics_events
    WHERE day IS NOT NULL
      AND created_at >= now() - interval '7 days'
    GROUP BY day
    ORDER BY day
  `) as {
    day: number;
    day_views: number;
    beat_plays: number;
    strudel_plays: number;
  }[];

  const recent = (await sql`
    SELECT
      created_at,
      event_name,
      day,
      visitor_id,
      referrer_bucket
    FROM analytics_events
    ORDER BY created_at DESC
    LIMIT 40
  `) as {
    created_at: Date;
    event_name: string;
    day: number | null;
    visitor_id: string | null;
    referrer_bucket: string | null;
  }[];

  const mapWindow = (row: Record<string, number>): WindowStats => ({
    totalEvents: row.total_events ?? 0,
    uniqueVisitors: row.unique_visitors ?? 0,
    pageViews: row.page_views ?? 0,
    dayViews: row.day_views ?? 0,
    beatPlays: row.beat_plays ?? 0,
    strudelPlays: row.strudel_plays ?? 0,
    lockedTaps: row.locked_taps ?? 0,
  });

  return {
    generatedAt: new Date().toISOString(),
    windows: {
      hours24: mapWindow(w24 as Record<string, number>),
      days7: mapWindow(w7 as Record<string, number>),
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
      visitorId: r.visitor_id
        ? `${r.visitor_id.slice(0, 8)}…`
        : null,
      referrerBucket: r.referrer_bucket,
    })),
    compareNote:
      "Neon = first-party detail. Vercel Hobby Analytics = separate dashboard (same custom event names where mirrored).",
  };
}
