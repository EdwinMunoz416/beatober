"use client";

import Link from "next/link";
import type { DayMetric } from "@/lib/analytics-query";

export type PostScheduleRow = {
  day: number;
  title?: string;
  approved: boolean;
};

export type PostMetricRow = PostScheduleRow & {
  uniqueViewers: number;
  uniquePlayers: number;
  dayViews: number;
  beatPlays: number;
  strudelPlays: number;
  visitorPlayRate: number;
};

export function mergePostMetrics(
  schedule: PostScheduleRow[] | null,
  byDay: DayMetric[],
): PostMetricRow[] {
  const metricByDay = new Map(byDay.map((r) => [r.day, r]));

  if (schedule && schedule.length > 0) {
    return schedule.map((meta) => rowFrom(meta, metricByDay.get(meta.day)));
  }

  const uniqueDays = [...new Set(byDay.map((d) => d.day))].sort((a, b) => a - b);
  if (uniqueDays.length === 0) return [];

  return uniqueDays.map((day) => {
    const meta = schedule?.find((d) => d.day === day);
    return rowFrom(
      {
        day,
        title: meta?.title,
        approved: meta?.approved ?? false,
      },
      metricByDay.get(day),
    );
  });
}

function rowFrom(
  meta: PostScheduleRow,
  m: DayMetric | undefined,
): PostMetricRow {
  const uniqueViewers = m?.uniqueViewers ?? 0;
  const uniquePlayers = m?.uniquePlayers ?? 0;
  const dayViews = m?.dayViews ?? 0;
  const beatPlays = m?.beatPlays ?? 0;
  const strudelPlays = m?.strudelPlays ?? 0;
  const visitorPlayRate =
    uniqueViewers > 0
      ? Math.round((uniquePlayers / uniqueViewers) * 100)
      : uniquePlayers > 0
        ? 100
        : 0;
  return {
    ...meta,
    uniqueViewers,
    uniquePlayers,
    dayViews,
    beatPlays,
    strudelPlays,
    visitorPlayRate,
  };
}

function maxInteraction(rows: PostMetricRow[]): number {
  let max = 1;
  for (const r of rows) {
    max = Math.max(max, r.uniqueViewers, r.uniquePlayers, r.dayViews, r.beatPlays);
  }
  return max;
}

type Props = {
  rows: PostMetricRow[];
  windowLabel: string;
  loading?: boolean;
};

export function AdminMetricsPosts({ rows, windowLabel, loading }: Props) {
  const max = maxInteraction(rows);
  const sorted = [...rows].sort((a, b) => {
    const scoreA = a.uniqueViewers + a.uniquePlayers;
    const scoreB = b.uniqueViewers + b.uniquePlayers;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return a.day - b.day;
  });

  const visible = sorted.filter(
    (r) =>
      r.approved ||
      r.uniqueViewers > 0 ||
      r.uniquePlayers > 0 ||
      r.dayViews > 0 ||
      r.beatPlays > 0,
  );

  const hasAny = visible.length > 0;

  return (
    <section className="admin-dash__panel admin-dash__panel--secondary">
      <div className="admin-dash__panel-head">
        <div>
          <h2 className="admin-dash__panel-title">Post reach · people first</h2>
          <p className="admin-dash__panel-desc">
            Unique viewers and players per day, then event volume · {windowLabel}
          </p>
        </div>
        <div className="admin-dash__legend" aria-hidden>
          <span className="admin-dash__legend-item admin-dash__legend-item--views">
            viewers
          </span>
          <span className="admin-dash__legend-item admin-dash__legend-item--beats">
            players
          </span>
        </div>
      </div>

      {loading ? (
        <p className="admin-dash__empty">Loading metrics…</p>
      ) : !hasAny ? (
        <p className="admin-dash__empty">
          No visitor interactions on posts yet for this window.
        </p>
      ) : (
        <div className="admin-dash__posts">
          {visible.map((row) => {
            const pad = String(row.day).padStart(2, "0");

            return (
              <article key={row.day} className="admin-dash__post-row">
                <div className="admin-dash__post-meta">
                  <Link href={`/day/${row.day}`} className="admin-dash__post-day">
                    {pad}
                  </Link>
                  <div className="admin-dash__post-text">
                    <span className="admin-dash__post-title">
                      {row.title ?? `day ${row.day}`}
                    </span>
                    <span className="admin-dash__post-badges">
                      {row.approved ? (
                        <span className="admin-dash__badge admin-dash__badge--live">
                          live
                        </span>
                      ) : (
                        <span className="admin-dash__badge">draft</span>
                      )}
                      <span className="admin-dash__badge">
                        {row.uniqueViewers} viewers · {row.uniquePlayers} players
                      </span>
                      {row.visitorPlayRate > 0 ? (
                        <span className="admin-dash__badge admin-dash__badge--eng">
                          {row.visitorPlayRate}% played
                        </span>
                      ) : null}
                      {row.dayViews > 0 || row.beatPlays > 0 ? (
                        <span className="admin-dash__badge admin-dash__badge--muted">
                          {row.dayViews} opens · {row.beatPlays} plays
                        </span>
                      ) : null}
                    </span>
                  </div>
                </div>
                <div className="admin-dash__post-bars">
                  <Bar
                    label="Unique viewers"
                    value={row.uniqueViewers}
                    max={max}
                    tone="views"
                  />
                  <Bar
                    label="Unique players"
                    value={row.uniquePlayers}
                    max={max}
                    tone="beats"
                  />
                </div>
                <div className="admin-dash__post-totals admin-dash__post-totals--two">
                  <span title="Unique viewers">{row.uniqueViewers}</span>
                  <span title="Unique players">{row.uniquePlayers}</span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Bar({
  label,
  value,
  max,
  tone,
}: {
  label: string;
  value: number;
  max: number;
  tone: "views" | "beats";
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="admin-dash__bar" title={`${label}: ${value}`}>
      <div
        className={`admin-dash__bar-fill admin-dash__bar-fill--${tone}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
