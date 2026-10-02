"use client";

import type { AdminMetrics } from "@/lib/analytics-query";
import { formatCountryCode, formatUsRegion } from "@/lib/geo-display";
import { euCountryCount } from "@/lib/analytics-geo-metrics";

type Props = {
  metrics: AdminMetrics | null;
  loading: boolean;
};

function maxVisitors(
  rows: { uniqueVisitors: number }[],
): number {
  return rows[0]?.uniqueVisitors ?? 0;
}

export function AdminGeography({ metrics, loading }: Props) {
  const geo = metrics?.geo7d;

  if (!metrics && loading) {
    return (
      <section className="admin-dash__geo" aria-label="Visitor geography">
        <p className="admin-dash__empty">Loading geography…</p>
      </section>
    );
  }

  if (!geo) return null;

  const maxCountry = maxVisitors(geo.countries);
  const maxUs = maxVisitors(geo.usRegions);
  const maxEu = maxVisitors(geo.euCountries);

  return (
    <section className="admin-dash__geo" aria-label="Visitor geography">
      <header className="admin-dash__geo-head">
        <h2 className="admin-dash__geo-title">Geography · 7 days</h2>
        <p className="admin-dash__geo-desc">
          First page view per browser (edge country/region).{" "}
          {geo.geoKnownVisitors} located · {geo.unknownGeoVisitors} unknown
          {geo.unknownGeoVisitors > 0 ? " (local dev or missing headers)" : ""}.
        </p>
      </header>

      <div className="admin-dash__geo-grid">
        <div>
          <h3 className="admin-dash__geo-subtitle">Countries</h3>
          {geo.countries.length === 0 ? (
            <p className="admin-dash__empty">No geo data yet — deploy and browse production.</p>
          ) : (
            <ul className="admin-dash__referrers">
              {geo.countries.slice(0, 16).map((row) => (
                <li key={row.country}>
                  <span className="admin-dash__referrer-label">
                    {formatCountryCode(row.country)}
                  </span>
                  <span className="admin-dash__referrer-bar-wrap">
                    <span
                      className="admin-dash__referrer-bar admin-dash__referrer-bar--geo"
                      style={{
                        width:
                          maxCountry > 0
                            ? `${Math.max(8, (row.uniqueVisitors / maxCountry) * 100)}%`
                            : "0%",
                      }}
                    />
                  </span>
                  <span className="admin-dash__referrer-count">
                    {row.uniqueVisitors}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 className="admin-dash__geo-subtitle">United States · regions</h3>
          {geo.usRegions.length === 0 ? (
            <p className="admin-dash__funnel-note">No US visitors with region data.</p>
          ) : (
            <ul className="admin-dash__referrers">
              {geo.usRegions.slice(0, 16).map((row) => (
                <li key={row.region}>
                  <span className="admin-dash__referrer-label">
                    {formatUsRegion(row.region)}
                  </span>
                  <span className="admin-dash__referrer-bar-wrap">
                    <span
                      className="admin-dash__referrer-bar admin-dash__referrer-bar--geo"
                      style={{
                        width:
                          maxUs > 0
                            ? `${Math.max(8, (row.uniqueVisitors / maxUs) * 100)}%`
                            : "0%",
                      }}
                    />
                  </span>
                  <span className="admin-dash__referrer-count">
                    {row.uniqueVisitors}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 className="admin-dash__geo-subtitle">
            European Union · countries ({euCountryCount()} member states)
          </h3>
          {geo.euCountries.length === 0 ? (
            <p className="admin-dash__funnel-note">No EU visitors yet.</p>
          ) : (
            <ul className="admin-dash__referrers">
              {geo.euCountries.map((row) => (
                <li key={row.country}>
                  <span className="admin-dash__referrer-label">
                    {formatCountryCode(row.country)}
                  </span>
                  <span className="admin-dash__referrer-bar-wrap">
                    <span
                      className="admin-dash__referrer-bar admin-dash__referrer-bar--geo"
                      style={{
                        width:
                          maxEu > 0
                            ? `${Math.max(8, (row.uniqueVisitors / maxEu) * 100)}%`
                            : "0%",
                      }}
                    />
                  </span>
                  <span className="admin-dash__referrer-count">
                    {row.uniqueVisitors}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {geo.euSubregions.length > 0 ? (
            <>
              <h4 className="admin-dash__geo-subtitle admin-dash__geo-subtitle--nested">
                EU · subnational regions
              </h4>
              <ul className="admin-dash__geo-subregions">
                {geo.euSubregions.slice(0, 12).map((row) => (
                  <li key={`${row.country}-${row.region}`}>
                    <span>
                      {formatCountryCode(row.country)} · {row.region}
                    </span>
                    <span>{row.uniqueVisitors}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
