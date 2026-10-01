"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminLoginForm } from "@/components/AdminLoginForm";
import type { AdminMetrics, MetricsAudience } from "@/lib/analytics-query";
import Link from "next/link";
import {
  isDayLocked,
  type BeatoberCalendar,
} from "@/lib/day-access";

type Props = {
  initialAuthed: boolean;
};

type AdminDay = {
  day: number;
  title?: string;
  approved: boolean;
  audioUrl: string | null;
};

type AdminDaysPayload = {
  year: number;
  month: number;
  days: AdminDay[];
};

function publicStatus(
  entry: AdminDay,
  calendar: BeatoberCalendar,
  now: Date,
): string {
  if (isDayLocked(entry.day, entry.approved, calendar, now, false)) {
    if (!entry.approved) return "Locked · not approved";
    return "Locked · calendar";
  }
  return "Live";
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: number | string;
  sub?: string;
}) {
  return (
    <div className="ctrl-stat">
      <span className="ctrl-stat-label">{label}</span>
      <span className="ctrl-stat-value">{value}</span>
      {sub ? <span className="ctrl-stat-sub">{sub}</span> : null}
    </div>
  );
}

export function AdminControlRoom({ initialAuthed }: Props) {
  const [authed, setAuthed] = useState(initialAuthed);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [audience, setAudience] = useState<MetricsAudience>("visitor");
  const [schedule, setSchedule] = useState<AdminDaysPayload | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [togglingDay, setTogglingDay] = useState<number | null>(null);

  const loadSchedule = useCallback(async () => {
    setScheduleError(null);
    try {
      const res = await fetch("/api/admin/days", { credentials: "include" });
      if (res.status === 401) {
        setAuthed(false);
        return;
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? res.statusText);
      }
      setSchedule((await res.json()) as AdminDaysPayload);
    } catch (err) {
      setScheduleError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const loadMetrics = useCallback(async () => {
    setRefreshing(true);
    setLoadError(null);
    try {
      const res = await fetch(
        `/api/admin/metrics?audience=${encodeURIComponent(audience)}`,
      );
      if (res.status === 401) {
        setAuthed(false);
        return;
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? res.statusText);
      }
      setMetrics((await res.json()) as AdminMetrics);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err));
    } finally {
      setRefreshing(false);
    }
  }, [audience]);

  useEffect(() => {
    if (authed) void loadMetrics();
  }, [authed, audience, loadMetrics]);

  useEffect(() => {
    if (authed) void loadSchedule();
  }, [authed, loadSchedule]);

  const toggleDayApproved = async (day: number, approved: boolean) => {
    setTogglingDay(day);
    setScheduleError(null);
    try {
      const res = await fetch(`/api/day/${day}/approve`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved }),
      });
      if (res.status === 401) {
        setAuthed(false);
        return;
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Could not update approval");
      }
      setSchedule((prev) =>
        prev
          ? {
              ...prev,
              days: prev.days.map((d) =>
                d.day === day ? { ...d, approved } : d,
              ),
            }
          : prev,
      );
    } catch (err) {
      setScheduleError(err instanceof Error ? err.message : String(err));
    } finally {
      setTogglingDay(null);
    }
  };

  const login = async () => {
    setLoginError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      setLoginError("Invalid password");
      return;
    }
    setAuthed(true);
    setPassword("");
  };

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthed(false);
    setMetrics(null);
  };

  if (!authed) {
    return (
      <div className="ctrl-page">
        <header className="ctrl-header">
          <h1 className="ctrl-title">control room</h1>
          <Link href="/" className="ctrl-link">
            ← site
          </Link>
        </header>
        <AdminLoginForm
          password={password}
          error={loginError}
          onPasswordChange={setPassword}
          onSubmit={() => void login()}
        />
      </div>
    );
  }

  const w = metrics?.windows.hours24;
  const w7 = metrics?.windows.days7;

  return (
    <div className="ctrl-page">
      <header className="ctrl-header">
        <div>
          <h1 className="ctrl-title">control room</h1>
          <p className="ctrl-subtitle">neon · 24h / 7d</p>
        </div>
        <div className="ctrl-header-actions">
          <select
            className="ctrl-input ctrl-select"
            value={audience}
            onChange={(e) =>
              setAudience(e.target.value as MetricsAudience)
            }
            aria-label="Audience filter"
          >
            <option value="visitor">Visitors</option>
            <option value="internal">Internal</option>
            <option value="all">All</option>
          </select>
          <button
            type="button"
            className="ctrl-btn"
            disabled={refreshing}
            onClick={() => void loadMetrics()}
          >
            {refreshing ? "…" : "Refresh"}
          </button>
          <Link href="/admin/devices" className="ctrl-link">
            devices
          </Link>
          <Link href="/" className="ctrl-link">
            site
          </Link>
          <button type="button" className="ctrl-btn ctrl-btn--ghost" onClick={() => void logout()}>
            Log out
          </button>
        </div>
      </header>

      {loadError ? <p className="ctrl-error">{loadError}</p> : null}
      {scheduleError ? <p className="ctrl-error">{scheduleError}</p> : null}

      <section className="ctrl-panel">
        <h2 className="ctrl-panel-title">Day approval</h2>
        <p className="ctrl-note ctrl-note--inset">
          Public unlock = approved and calendar date reached. Toggle here after
          login (replaces the removed author bar).
        </p>
        <div className="ctrl-table-wrap">
          <table className="ctrl-table">
            <thead>
              <tr>
                <th>Day</th>
                <th>Title</th>
                <th>Public</th>
                <th>Beat</th>
                <th>Approve</th>
              </tr>
            </thead>
            <tbody>
              {!schedule ? (
                <tr>
                  <td colSpan={5} className="ctrl-empty">
                    Loading schedule…
                  </td>
                </tr>
              ) : (
                schedule.days.map((row) => {
                  const calendar: BeatoberCalendar = {
                    year: schedule.year,
                    month: schedule.month,
                  };
                  const status = publicStatus(row, calendar, new Date());
                  return (
                    <tr key={row.day}>
                      <td>
                        <Link href={`/day/${row.day}`} className="ctrl-link">
                          {String(row.day).padStart(2, "0")}
                        </Link>
                      </td>
                      <td>{row.title ?? "—"}</td>
                      <td>{status}</td>
                      <td>{row.audioUrl ? "yes" : "—"}</td>
                      <td>
                        <button
                          type="button"
                          className="ctrl-btn ctrl-btn--compact"
                          disabled={togglingDay === row.day}
                          onClick={() =>
                            void toggleDayApproved(row.day, !row.approved)
                          }
                        >
                          {togglingDay === row.day
                            ? "…"
                            : row.approved
                              ? "Revoke"
                              : "Approve"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {metrics ? (
        <>
          <p className="ctrl-note">{metrics.compareNote}</p>
          <section className="ctrl-grid">
            <Stat label="Events (24h)" value={w?.totalEvents ?? 0} />
            <Stat label="Visitors (24h)" value={w?.uniqueVisitors ?? 0} />
            <Stat label="Page views (24h)" value={w?.pageViews ?? 0} />
            <Stat label="Day opens (24h)" value={w?.dayViews ?? 0} />
            <Stat label="Beat plays (24h)" value={w?.beatPlays ?? 0} />
            <Stat label="Strudel plays (24h)" value={w?.strudelPlays ?? 0} />
            <Stat label="Locked taps (24h)" value={w?.lockedTaps ?? 0} />
            <Stat
              label="Visitors (7d)"
              value={w7?.uniqueVisitors ?? 0}
              sub={`${w7?.totalEvents ?? 0} events`}
            />
          </section>

          <section className="ctrl-panel">
            <h2 className="ctrl-panel-title">By day (7d)</h2>
            <div className="ctrl-table-wrap">
              <table className="ctrl-table">
                <thead>
                  <tr>
                    <th>Day</th>
                    <th>Opens</th>
                    <th>Beats</th>
                    <th>Strudel</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.byDay.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="ctrl-empty">
                        No day-scoped events yet
                      </td>
                    </tr>
                  ) : (
                    metrics.byDay.map((row) => (
                      <tr key={row.day}>
                        <td>{String(row.day).padStart(2, "0")}</td>
                        <td>{row.dayViews}</td>
                        <td>{row.beatPlays}</td>
                        <td>{row.strudelPlays}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="ctrl-panel">
            <h2 className="ctrl-panel-title">Recent stream</h2>
            <ul className="ctrl-stream">
              {metrics.recent.map((ev, i) => (
                <li key={`${ev.at}-${i}`}>
                  <span className="ctrl-stream-time">
                    {new Date(ev.at).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="ctrl-stream-event">{ev.eventName}</span>
                  {ev.day != null ? (
                    <span className="ctrl-stream-day">d{String(ev.day).padStart(2, "0")}</span>
                  ) : null}
                  {ev.referrerBucket ? (
                    <span className="ctrl-stream-ref">{ev.referrerBucket}</span>
                  ) : null}
                  {ev.audience && ev.audience !== "visitor" ? (
                    <span className="ctrl-stream-ref">{ev.audience}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>

          <p className="ctrl-foot">
            Updated {new Date(metrics.generatedAt).toLocaleString()}
          </p>
        </>
      ) : (
        <p className="ctrl-note">{refreshing ? "Loading…" : "No data"}</p>
      )}
    </div>
  );
}
