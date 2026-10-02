"use client";

import { useState } from "react";
import { AdminVisitorProfileDrawer } from "@/components/AdminVisitorProfileDrawer";
import { VisitorAvatar } from "@/components/VisitorAvatar";
import type { AdminMetrics, MetricsAudience } from "@/lib/analytics-query";
import type { VisitorProfile } from "@/lib/analytics-visitor-profiles";
import { formatGeoChip } from "@/lib/geo-display";
import { formatReferrerTrail } from "@/lib/referrer-display";
import {
  formatActiveDays,
  formatDurationMs,
  formatRelative,
  formatWhen,
  profileDisplayName,
  profileSeriesLabel,
  visitorStoryLine,
} from "@/lib/visitor-profile-ui";

type Props = {
  metrics: AdminMetrics | null;
  loading: boolean;
  audience: MetricsAudience;
};

export function AdminVisitorProfiles({ metrics, loading, audience }: Props) {
  const visitors = metrics?.visitors ?? [];
  const total7d = metrics?.windows.days7.siteVisitors ?? 0;
  const [selected, setSelected] = useState<VisitorProfile | null>(null);

  return (
    <section className="admin-dash__people" aria-label="Visitors">
      <header className="admin-dash__people-head">
        <div>
          <h2 className="admin-dash__people-title">Visitors</h2>
          <p className="admin-dash__people-desc">
            {loading && !metrics
              ? "Loading…"
              : `${visitors.length} browsers shown · ${total7d} touched the site in 7d · open a card for their story`}
          </p>
          {visitors.length > 0 ? (
            <p className="admin-dash__people-note">
              Each browser gets a unique character on first visit (locked in the
              database). Incognito or another device is a separate character.
            </p>
          ) : null}
        </div>
      </header>

      {!metrics && loading ? (
        <p className="admin-dash__empty">Loading visitor profiles…</p>
      ) : visitors.length === 0 ? (
        <p className="admin-dash__empty">No visitors in the last 7 days yet.</p>
      ) : (
        <ul className="admin-dash__profile-grid">
          {visitors.map((v) => (
            <VisitorCard
              key={`${v.visitorId}-${v.audience}`}
              profile={v}
              onOpen={() => setSelected(v)}
            />
          ))}
        </ul>
      )}

      {selected ? (
        <AdminVisitorProfileDrawer
          profile={selected}
          audience={audience}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </section>
  );
}

function VisitorCard({
  profile: v,
  onOpen,
}: {
  profile: VisitorProfile;
  onOpen: () => void;
}) {
  const name = profileDisplayName(v.deviceLabel, v.lockedNickname);
  const series = profileSeriesLabel(v.deviceLabel, v.lockedShowTitle);
  const story = visitorStoryLine({
    lastPath: v.lastPath,
    topDay: v.topDay,
    lastReferrerSource: v.lastReferrerSource,
    geoCountry: v.lastGeoCountry ?? v.geoCountry,
    geoRegion: v.lastGeoRegion ?? v.geoRegion,
    playedBeat: v.playedBeat,
    isReturning: v.isReturning,
  });
  const lastActive = formatRelative(v.lastSeenAt);
  const firstSeen = formatWhen(v.firstSeenAt);
  const daysSummary =
    v.days.length > 0
      ? v.days.map((d) => String(d).padStart(2, "0")).join(", ")
      : "—";

  const geoFirst = formatGeoChip(v.geoCountry, v.geoRegion);
  const geoLast = formatGeoChip(v.lastGeoCountry, v.lastGeoRegion);
  const geoLabel =
    geoFirst === "Geo unknown" && geoLast === "Geo unknown"
      ? null
      : geoFirst === geoLast
        ? geoFirst
        : `${geoFirst} → ${geoLast}`;

  return (
    <li className="admin-dash__profile-cell">
      <button type="button" className="admin-dash__profile" onClick={onOpen}>
        <div className="admin-dash__profile-top">
          <VisitorAvatar
            visitorId={v.visitorId}
            avatarUrl={v.lockedAvatarUrl}
            alt={name}
          />
          <div className="admin-dash__profile-id-block">
            <span className="admin-dash__profile-name">{name}</span>
            <span className="admin-dash__profile-tagline">{story}</span>
            <div className="admin-dash__profile-tags">
              {series ? (
                <span
                  className="admin-dash__profile-tag admin-dash__profile-tag--anime"
                  title="Series"
                >
                  {series}
                </span>
              ) : null}
              <span
                className="admin-dash__profile-tag"
                title={`First: ${v.referrerSource} · Latest: ${v.lastReferrerSource}`}
              >
                {formatReferrerTrail(v.referrerSource, v.lastReferrerSource)}
              </span>
              {geoLabel ? (
                <span className="admin-dash__profile-tag admin-dash__profile-tag--geo">
                  {geoLabel}
                </span>
              ) : null}
              {v.audience !== "visitor" ? (
                <span className="admin-dash__profile-tag admin-dash__profile-tag--internal">
                  {v.audience}
                </span>
              ) : null}
              {v.isReturning ? (
                <span className="admin-dash__profile-tag admin-dash__profile-tag--return">
                  returning
                </span>
              ) : (
                <span className="admin-dash__profile-tag admin-dash__profile-tag--muted">
                  first visit
                </span>
              )}
              {v.playedBeat ? (
                <span className="admin-dash__profile-tag admin-dash__profile-tag--play">
                  played beat
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <dl className="admin-dash__profile-stats">
          <div>
            <dt>Last active</dt>
            <dd title={v.lastSeenAt}>{lastActive}</dd>
          </div>
          <div>
            <dt>Active days</dt>
            <dd title="Distinct calendar days with activity (7d)">
              {formatActiveDays(v.activeDays)}
            </dd>
          </div>
          <div>
            <dt>Page views</dt>
            <dd>{v.pageViews > 0 ? v.pageViews : "—"}</dd>
          </div>
          <div>
            <dt>Beats</dt>
            <dd>{v.postsTouched > 0 ? v.postsTouched : "—"}</dd>
          </div>
          <div>
            <dt>Listen</dt>
            <dd title={`${v.beatListenMs} ms`}>
              {v.beatListenMs > 0 ? formatDurationMs(v.beatListenMs) : "—"}
            </dd>
          </div>
          <div>
            <dt>On page</dt>
            <dd title={`${v.pageEngagementMs} ms`}>
              {v.pageEngagementMs > 0
                ? formatDurationMs(v.pageEngagementMs)
                : "—"}
            </dd>
          </div>
        </dl>

        <p className="admin-dash__profile-insight">
          {v.topDay != null ? (
            <>
              Top day{" "}
              <strong>{String(v.topDay).padStart(2, "0")}</strong>
            </>
          ) : (
            "No focused day yet"
          )}
          {v.strudelPlays > 0 || v.audioPlays > 0 ? (
            <>
              {" · "}
              {v.strudelPlays > 0 ? `${v.strudelPlays} strudel` : null}
              {v.strudelPlays > 0 && v.audioPlays > 0 ? ", " : null}
              {v.audioPlays > 0 ? `${v.audioPlays} audio` : null}
            </>
          ) : null}
          {v.beatLoopCompletes > 0 ? (
            <>
              {" · "}
              {v.beatLoopCompletes} full loop{v.beatLoopCompletes === 1 ? "" : "s"}
            </>
          ) : null}
          {v.shareLandings > 0 ? (
            <>
              {" · "}
              {v.shareLandings} share landing{v.shareLandings === 1 ? "" : "s"}
            </>
          ) : null}
          {v.patternErrors > 0 ? (
            <>
              {" · "}
              {v.patternErrors} play error{v.patternErrors === 1 ? "" : "s"}
            </>
          ) : null}
          {v.lockedTaps > 0 || v.lockedScrolls > 0 ? (
            <>
              {" · "}
              {v.lockedTaps > 0 ? `${v.lockedTaps} locked taps` : null}
              {v.lockedTaps > 0 && v.lockedScrolls > 0 ? ", " : null}
              {v.lockedScrolls > 0 ? `${v.lockedScrolls} scroll signals` : null}
            </>
          ) : null}
        </p>

        <p className="admin-dash__profile-days-line" title={daysSummary}>
          <span className="admin-dash__profile-days-label">Days</span>
          <span className="admin-dash__profile-days-value">{daysSummary}</span>
        </p>

        <footer className="admin-dash__profile-foot">
          <span>First seen {firstSeen}</span>
          <span className="admin-dash__profile-open-hint">View timeline →</span>
        </footer>
      </button>
    </li>
  );
}
