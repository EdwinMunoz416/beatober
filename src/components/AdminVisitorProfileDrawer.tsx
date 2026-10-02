"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { MetricsAudience } from "@/lib/analytics-query";
import type {
  VisitorProfile,
  VisitorTimelineEvent,
} from "@/lib/analytics-visitor-profiles";
import { groupTimelineBySession } from "@/lib/visitor-timeline-ui";
import { VisitorUserIcon } from "@/components/VisitorUserIcon";
import { formatReferrerTrail } from "@/lib/referrer-display";
import {
  formatDurationMs,
  formatRelative,
  formatWhen,
  profileDisplayName,
} from "@/lib/visitor-profile-ui";

type Props = {
  profile: VisitorProfile;
  audience: MetricsAudience;
  onClose: () => void;
};

function timelineDetail(ev: VisitorTimelineEvent): string | null {
  const parts: string[] = [];
  if (ev.durationMs != null && ev.durationMs > 0) {
    parts.push(formatDurationMs(ev.durationMs));
  }
  if (ev.reason) parts.push(ev.reason);
  if (ev.depthPct != null) parts.push(`${ev.depthPct}% scroll`);
  if (ev.loopIndex != null) parts.push(`loop ${ev.loopIndex}`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function AdminVisitorProfileDrawer({
  profile,
  audience,
  onClose,
}: Props) {
  const [events, setEvents] = useState<VisitorTimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const name = profileDisplayName(profile.displayId, profile.deviceLabel);
  const sessions = useMemo(() => groupTimelineBySession(events), [events]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/visitors/${encodeURIComponent(profile.visitorId)}/timeline?audience=${encodeURIComponent(audience)}`,
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          detail?: string;
        };
        throw new Error(
          [data.error, data.detail].filter(Boolean).join(" — ") ||
            res.statusText,
        );
      }
      const data = (await res.json()) as { events: VisitorTimelineEvent[] };
      setEvents(data.events);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [profile.visitorId, audience]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="admin-dash__drawer-root" role="presentation">
      <button
        type="button"
        className="admin-dash__drawer-backdrop"
        aria-label="Close profile"
        onClick={onClose}
      />
      <aside
        className="admin-dash__drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="visitor-drawer-title"
      >
        <header className="admin-dash__drawer-head">
          <div className="admin-dash__drawer-identity">
            <div className="admin-dash__avatar admin-dash__avatar--lg" aria-hidden>
              <VisitorUserIcon className="admin-dash__avatar-icon admin-dash__avatar-icon--lg" />
            </div>
            <div>
              <h2 id="visitor-drawer-title" className="admin-dash__drawer-title">
                {name}
              </h2>
              <p className="admin-dash__drawer-sub">{profile.visitorId}</p>
            </div>
          </div>
          <button
            type="button"
            className="admin-dash__btn admin-dash__btn--ghost"
            onClick={onClose}
          >
            Close
          </button>
        </header>

        <dl className="admin-dash__drawer-stats">
          <div>
            <dt>Visitor type</dt>
            <dd>{profile.isReturning ? "Returning" : "First visit"}</dd>
          </div>
          <div>
            <dt>First seen</dt>
            <dd>{formatWhen(profile.firstSeenAt)}</dd>
          </div>
          <div>
            <dt>Last active</dt>
            <dd>{formatRelative(profile.lastSeenAt)}</dd>
          </div>
          <div>
            <dt>Sessions</dt>
            <dd>{profile.sessions}</dd>
          </div>
          <div>
            <dt>Beat listen</dt>
            <dd>
              {profile.beatListenMs > 0
                ? formatDurationMs(profile.beatListenMs)
                : "—"}
            </dd>
          </div>
          <div>
            <dt>Visible on site</dt>
            <dd>
              {profile.pageEngagementMs > 0
                ? formatDurationMs(profile.pageEngagementMs)
                : "—"}
            </dd>
          </div>
          <div>
            <dt>Top day</dt>
            <dd>
              {profile.topDay != null
                ? String(profile.topDay).padStart(2, "0")
                : "—"}
            </dd>
          </div>
          <div>
            <dt>Plays</dt>
            <dd>
              {profile.strudelPlays > 0 || profile.audioPlays > 0
                ? [
                    profile.strudelPlays > 0
                      ? `${profile.strudelPlays} strudel`
                      : null,
                    profile.audioPlays > 0
                      ? `${profile.audioPlays} audio`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(", ")
                : profile.beatPlays > 0
                  ? String(profile.beatPlays)
                  : "—"}
            </dd>
          </div>
          <div>
            <dt>Locked curiosity</dt>
            <dd>
              {profile.lockedTaps > 0 || profile.lockedScrolls > 0
                ? `${profile.lockedTaps} taps, ${profile.lockedScrolls} scroll`
                : "—"}
            </dd>
          </div>
          <div>
            <dt>Source</dt>
            <dd>
              {formatReferrerTrail(
                profile.referrerSource,
                profile.lastReferrerSource,
              )}
            </dd>
          </div>
          <div>
            <dt>Full loops</dt>
            <dd>{profile.beatLoopCompletes > 0 ? profile.beatLoopCompletes : "—"}</dd>
          </div>
          <div>
            <dt>Share landings</dt>
            <dd>{profile.shareLandings > 0 ? profile.shareLandings : "—"}</dd>
          </div>
          <div>
            <dt>Play errors</dt>
            <dd title="Visitor play failures on published patterns">
              {profile.patternErrors > 0 ? profile.patternErrors : "—"}
            </dd>
          </div>
        </dl>

        {profile.days.length > 0 ? (
          <div className="admin-dash__drawer-days">
            {profile.days.map((d) => (
              <Link
                key={d}
                href={`/day/${d}`}
                className="admin-dash__day-chip"
              >
                day {String(d).padStart(2, "0")}
              </Link>
            ))}
          </div>
        ) : null}

        <section className="admin-dash__drawer-timeline-wrap">
          <h3 className="admin-dash__drawer-section-title">
            Activity by session · 30 days
          </h3>
          {loading ? (
            <p className="admin-dash__empty">Loading timeline…</p>
          ) : error ? (
            <p className="admin-dash__error">{error}</p>
          ) : events.length === 0 ? (
            <p className="admin-dash__empty">No events in this window.</p>
          ) : (
            <div className="admin-dash__session-list">
              {sessions.map((block) => (
                <section
                  key={block.sessionKey}
                  className="admin-dash__session-block"
                >
                  <header className="admin-dash__session-head">
                    <span className="admin-dash__session-id">{block.label}</span>
                    {block.listenMs > 0 ? (
                      <span className="admin-dash__session-meta">
                        listen {formatDurationMs(block.listenMs)}
                      </span>
                    ) : null}
                    {block.engagementMs > 0 ? (
                      <span className="admin-dash__session-meta">
                        on page {formatDurationMs(block.engagementMs)}
                      </span>
                    ) : null}
                  </header>
                  <ol className="admin-dash__timeline">
                    {block.events.map((ev, i) => {
                      const detail = timelineDetail(ev);
                      return (
                        <li key={`${ev.at}-${ev.eventName}-${i}`}>
                          <time dateTime={ev.at} title={ev.at}>
                            {formatWhen(ev.at)}
                          </time>
                          <span className="admin-dash__timeline-event">
                            {ev.eventName}
                          </span>
                          {ev.day != null ? (
                            <Link
                              href={`/day/${ev.day}`}
                              className="admin-dash__timeline-day"
                            >
                              day {String(ev.day).padStart(2, "0")}
                            </Link>
                          ) : null}
                          {ev.medium ? (
                            <span className="admin-dash__timeline-meta">
                              {ev.medium}
                            </span>
                          ) : null}
                          {ev.repeat ? (
                            <span className="admin-dash__timeline-meta">
                              repeat
                            </span>
                          ) : null}
                          {detail ? (
                            <span className="admin-dash__timeline-meta">
                              {detail}
                            </span>
                          ) : null}
                          {ev.path ? (
                            <span className="admin-dash__timeline-path">
                              {ev.path}
                            </span>
                          ) : null}
                        </li>
                      );
                    })}
                  </ol>
                </section>
              ))}
            </div>
          )}
        </section>
      </aside>
    </div>
  );
}
