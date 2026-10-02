"use client";

import type { AdminMetrics } from "@/lib/analytics-query";
import { formatReferrerSource } from "@/lib/referrer-display";

type Props = {
  metrics: AdminMetrics | null;
  loading: boolean;
};

export function AdminTrafficSources({ metrics, loading }: Props) {
  const firstTouch = metrics?.firstTouchSources7d ?? [];
  const allViews = metrics?.trafficSources7d ?? [];
  const maxFirst = firstTouch[0]?.uniqueVisitors ?? 0;

  if (!metrics && loading) {
    return (
      <section className="admin-dash__traffic" aria-label="Traffic sources">
        <p className="admin-dash__empty">Loading sources…</p>
      </section>
    );
  }

  if (!metrics) return null;

  return (
    <section className="admin-dash__traffic" aria-label="Traffic sources">
      <header className="admin-dash__traffic-head">
        <h2 className="admin-dash__traffic-title">Where visitors come from · 7 days</h2>
        <p className="admin-dash__traffic-desc">
          <strong>First touch</strong> = how each browser first arrived (best for “I only
          posted on Discord”). <strong>All page views</strong> includes returns via
          bookmark or typed URL (<em>Direct</em>).
        </p>
      </header>

      <div className="admin-dash__traffic-grid">
        <div>
          <h3 className="admin-dash__traffic-subtitle">First touch · unique browsers</h3>
          {firstTouch.length === 0 ? (
            <p className="admin-dash__empty">No page views yet.</p>
          ) : (
            <ul className="admin-dash__referrers">
              {firstTouch.map((row) => (
                <li key={row.source}>
                  <span className="admin-dash__referrer-label">
                    {formatReferrerSource(row.source)}
                  </span>
                  <span className="admin-dash__referrer-bar-wrap">
                    <span
                      className="admin-dash__referrer-bar"
                      style={{
                        width:
                          maxFirst > 0
                            ? `${Math.max(8, (row.uniqueVisitors / maxFirst) * 100)}%`
                            : "0%",
                      }}
                    />
                  </span>
                  <span className="admin-dash__referrer-count">{row.uniqueVisitors}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 className="admin-dash__traffic-subtitle">All page views by source</h3>
          {allViews.length === 0 ? (
            <p className="admin-dash__empty">No page views yet.</p>
          ) : (
            <ul className="admin-dash__referrers">
              {allViews.map((row) => (
                <li key={row.source}>
                  <span className="admin-dash__referrer-label">
                    {formatReferrerSource(row.source)}
                  </span>
                  <span className="admin-dash__referrer-meta">
                    {row.uniqueVisitors} browsers · {row.pageViews} views
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
