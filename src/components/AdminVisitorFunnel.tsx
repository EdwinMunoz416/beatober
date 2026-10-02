"use client";

import type { AdminMetrics } from "@/lib/analytics-query";

type Props = {
  metrics: AdminMetrics | null;
  loading: boolean;
};

function pct(part: number, whole: number): string {
  if (whole <= 0) return "—";
  return `${Math.round((part / whole) * 100)}%`;
}

export function AdminVisitorFunnel({ metrics, loading }: Props) {
  const f = metrics?.funnel7d;
  const share = metrics?.shareLandings7d ?? [];

  if (!metrics && loading) {
    return (
      <section className="admin-dash__funnel" aria-label="Engagement funnel">
        <p className="admin-dash__empty">Loading funnel…</p>
      </section>
    );
  }

  if (!f) return null;

  const steps = [
    { label: "Site visit", value: f.siteVisitors },
    { label: "Viewed a post", value: f.dayViewVisitors },
    { label: "Played beat", value: f.beatPlayVisitors },
    { label: "Listened ≥30s", value: f.listen30sVisitors },
    { label: "Full loop", value: f.loopCompleteVisitors },
  ];

  return (
    <section className="admin-dash__funnel" aria-label="Engagement funnel">
      <header className="admin-dash__funnel-head">
        <h2 className="admin-dash__funnel-title">Engagement funnel · 7 days</h2>
        <p className="admin-dash__funnel-desc">
          Unique browsers at each step · {f.shareLandingSessions} share/OG session
          {f.shareLandingSessions === 1 ? "" : "s"} on a day link
        </p>
      </header>

      <ol className="admin-dash__funnel-steps">
        {steps.map((step, i) => {
          const prev = i > 0 ? steps[i - 1]!.value : step.value;
          return (
            <li key={step.label}>
              <span className="admin-dash__funnel-label">{step.label}</span>
              <span className="admin-dash__funnel-value">{step.value}</span>
              <span className="admin-dash__funnel-pct">
                {i === 0 ? "100%" : pct(step.value, f.siteVisitors)}
                {i > 0 ? ` · ${pct(step.value, prev)} of prev` : null}
              </span>
            </li>
          );
        })}
      </ol>

      {share.length > 0 ? (
        <div className="admin-dash__share-landings">
          <h3 className="admin-dash__share-title">Share / OG landings by day</h3>
          <ul className="admin-dash__share-list">
            {share.map((row) => (
              <li key={row.day}>
                <span>Day {String(row.day).padStart(2, "0")}</span>
                <span>
                  {row.landingCount} landing{row.landingCount === 1 ? "" : "s"}
                </span>
                <span>{row.uniqueVisitors} browsers</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="admin-dash__funnel-note">
          No share/OG day landings yet — fires when a session starts on{" "}
          <code>/day/N</code> from off-site (social, messages, or empty referrer).
        </p>
      )}
    </section>
  );
}
