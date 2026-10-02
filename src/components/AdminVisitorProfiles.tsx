"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminVisitorProfileDrawer } from "@/components/AdminVisitorProfileDrawer";
import { VisitorAvatar } from "@/components/VisitorAvatar";
import type { AdminMetrics, MetricsAudience } from "@/lib/analytics-query";
import type { VisitorProfile } from "@/lib/analytics-visitor-profiles";
import { formatGeoChip } from "@/lib/geo-display";
import { formatBeatProgress } from "@/lib/beat-progress";
import {
  formatActiveDays,
  formatDurationMs,
  formatRelative,
  formatWhen,
  profileDisplayName,
} from "@/lib/visitor-profile-ui";

type Props = {
  metrics: AdminMetrics | null;
  loading: boolean;
  audience: MetricsAudience;
};

export function AdminVisitorProfiles({ metrics, loading, audience }: Props) {
  const visitors = metrics?.visitors ?? [];
  const [selected, setSelected] = useState<VisitorProfile | null>(null);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setOnlineIds(new Set(metrics?.onlineVisitorIds ?? []));
  }, [metrics?.onlineVisitorIds]);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(
          `/api/admin/online?audience=${encodeURIComponent(audience)}`,
        );
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { visitorIds?: string[] };
        setOnlineIds(new Set(data.visitorIds ?? []));
      } catch {
        /* ignore poll errors */
      }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 10_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [audience]);

  const onlineCount = useMemo(
    () => visitors.filter((v) => onlineIds.has(v.visitorId)).length,
    [visitors, onlineIds],
  );

  useEffect(() => {
    if (!selected) return;
    const fresh = visitors.find(
      (v) =>
        v.visitorId === selected.visitorId && v.audience === selected.audience,
    );
    if (!fresh) return;
    setSelected((prev) => {
      if (!prev || prev.visitorId !== fresh.visitorId) return prev;
      if (
        prev.pageEngagementMs === fresh.pageEngagementMs &&
        prev.lastSeenAt === fresh.lastSeenAt &&
        prev.beatListenMs === fresh.beatListenMs &&
        prev.eventCount === fresh.eventCount
      ) {
        return prev;
      }
      return fresh;
    });
  }, [visitors, selected?.visitorId, selected?.audience]);

  return (
    <section className="admin-dash__people" aria-label="Visitors">
      <header className="admin-dash__people-head">
        <div>
          <h2 className="admin-dash__people-title">Visitors</h2>
          <p className="admin-dash__people-desc">
            {loading && !metrics
              ? "Loading…"
              : `${visitors.length} browsers · ${onlineCount} online now · all-time stats`}
          </p>
          {metrics && onlineCount > 0 ? (
            <p className="admin-dash__people-online-legend">
              <span className="admin-dash__avatar-online-dot" aria-hidden />
              Online = site tab open in the last {metrics.onlineWindowSeconds}s
            </p>
          ) : null}
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
        <p className="admin-dash__empty">No visitor analytics yet.</p>
      ) : (
        <ul className="admin-dash__profile-grid">
          {visitors.map((v) => (
            <VisitorCard
              key={`${v.visitorId}-${v.audience}`}
              profile={v}
              online={onlineIds.has(v.visitorId)}
              onOpen={() => setSelected(v)}
            />
          ))}
        </ul>
      )}

      {selected ? (
        <AdminVisitorProfileDrawer
          profile={selected}
          audience={audience}
          online={onlineIds.has(selected.visitorId)}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </section>
  );
}

function VisitorCard({
  profile: v,
  online,
  onOpen,
}: {
  profile: VisitorProfile;
  online: boolean;
  onOpen: () => void;
}) {
  const name = profileDisplayName(v.deviceLabel, v.lockedNickname);
  const lastActive = formatRelative(v.lastSeenAt);
  const firstSeen = formatWhen(v.firstSeenAt);
  const daysSummary =
    v.days.length > 0
      ? v.days.map((d) => String(d).padStart(2, "0")).join(", ")
      : "—";

  const geoFirst = formatGeoChip(v.geoCountry, v.geoRegion);
  const geoLast = formatGeoChip(v.lastGeoCountry, v.lastGeoRegion);
  const location =
    geoFirst === "Geo unknown" && geoLast === "Geo unknown"
      ? "Location unknown"
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
            online={online}
          />
          <div className="admin-dash__profile-id-block">
            <div className="admin-dash__profile-head-row">
              <span className="admin-dash__profile-name">
                {name}
                {online ? (
                  <span className="admin-dash__profile-online-label">
                    Online
                  </span>
                ) : null}
              </span>
              <span
                className="admin-dash__profile-first-seen"
                title={v.firstSeenAt}
              >
                <span className="admin-dash__profile-first-seen-label">
                  First seen
                </span>
                {firstSeen}
              </span>
            </div>
            <span className="admin-dash__profile-location">{location}</span>
          </div>
        </div>

        <dl className="admin-dash__profile-stats">
          <div>
            <dt>Last active</dt>
            <dd title={v.lastSeenAt}>{lastActive}</dd>
          </div>
          <div>
            <dt>Active days</dt>
            <dd title="Distinct calendar days with activity (all time)">
              {formatActiveDays(v.activeDays)}
            </dd>
          </div>
          <div>
            <dt>Page views</dt>
            <dd>{v.pageViews > 0 ? v.pageViews : "—"}</dd>
          </div>
          <div>
            <dt>Started</dt>
            <dd title="Approved days with at least one play">
              {formatBeatProgress(v.beatProgressStarted)}
            </dd>
          </div>
          <div>
            <dt>Complete</dt>
            <dd title="Approved days with at least one full loop">
              {formatBeatProgress(v.beatProgressComplete)}
            </dd>
          </div>
          <div>
            <dt>Listen</dt>
            <dd title={`${v.beatListenMs} ms`}>
              {v.beatListenMs > 0 ? formatDurationMs(v.beatListenMs) : "—"}
            </dd>
          </div>
          <div>
            <dt>On page</dt>
            <dd
              title={`${v.pageEngagementMs} ms total · saved in ~30s chunks while the tab is visible`}
            >
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
          <span className="admin-dash__profile-days-label">Started days</span>
          <span className="admin-dash__profile-days-value">{daysSummary}</span>
        </p>

        <footer className="admin-dash__profile-foot">
          <span className="admin-dash__profile-open-hint">View timeline →</span>
        </footer>
      </button>
    </li>
  );
}
