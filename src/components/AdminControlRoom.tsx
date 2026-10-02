"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AdminMetricsPosts,
  mergePostMetrics,
} from "@/components/AdminMetricsPosts";
import { AdminTrafficSources } from "@/components/AdminTrafficSources";
import { AdminVisitorFunnel } from "@/components/AdminVisitorFunnel";
import { AdminVisitorProfiles } from "@/components/AdminVisitorProfiles";
import { AdminPublishingPanel } from "@/components/AdminPublishingPanel";
import { AdminLoginPage, AdminShell } from "@/components/AdminShell";
import type { AdminMetrics, MetricsAudience } from "@/lib/analytics-query";

type Props = {
  initialAuthed: boolean;
};

type AdminDaysPayload = {
  year: number;
  month: number;
  days: {
    day: number;
    title?: string;
    approved: boolean;
    audioUrl: string | null;
  }[];
};

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
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          detail?: string;
        };
        throw new Error(
          [data.error, data.detail].filter(Boolean).join(" — ") ||
            res.statusText,
        );
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

  const postRows = useMemo(
    () =>
      mergePostMetrics(
        schedule?.days ?? null,
        metrics?.byDay ?? [],
      ),
    [schedule?.days, metrics?.byDay],
  );

  if (!authed) {
    return (
      <AdminLoginPage
        title="Metrics"
        password={password}
        error={loginError}
        onPasswordChange={setPassword}
        onSubmit={() => void login()}
      />
    );
  }

  const toolbar = (
    <>
      <select
        className="admin-dash__input admin-dash__select"
        value={audience}
        onChange={(e) => setAudience(e.target.value as MetricsAudience)}
        aria-label="Audience filter"
      >
        <option value="visitor">Visitors</option>
        <option value="internal">Internal</option>
        <option value="all">All events</option>
      </select>
      <button
        type="button"
        className="admin-dash__btn"
        disabled={refreshing}
        onClick={() => void loadMetrics()}
      >
        {refreshing ? "Refreshing…" : "Refresh"}
      </button>
    </>
  );

  return (
    <AdminShell
      active="metrics"
      title="Visitor metrics"
      subtitle="People on your site (anonymous browsers), then post reach"
      toolbar={toolbar}
      onLogout={() => void logout()}
    >
      {loadError ? <p className="admin-dash__error">{loadError}</p> : null}

      <AdminVisitorProfiles
        metrics={metrics}
        loading={refreshing}
        audience={audience}
      />

      <AdminTrafficSources metrics={metrics} loading={refreshing} />

      <AdminVisitorFunnel metrics={metrics} loading={refreshing} />

      {metrics ? (
        <p className="admin-dash__note admin-dash__note--top">{metrics.compareNote}</p>
      ) : null}

      <details className="admin-dash__secondary admin-dash__secondary--open" open>
        <summary className="admin-dash__secondary-summary">
          <span className="admin-dash__secondary-title">Post reach · 7 days</span>
          <span className="admin-dash__secondary-hint">
            unique viewers &amp; players per day
          </span>
        </summary>
        <div className="admin-dash__secondary-body admin-dash__secondary-body--flush">
          <AdminMetricsPosts
            rows={postRows}
            windowLabel="last 7 days"
            loading={refreshing && !metrics}
          />
        </div>
      </details>

      <div className="admin-dash__layout admin-dash__layout--single">
        <aside className="admin-dash__layout-aside admin-dash__layout-aside--full">
          <section className="admin-dash__panel">
            <h2 className="admin-dash__panel-title">Live activity</h2>
            <p className="admin-dash__panel-desc">Latest visitor events</p>
            {!metrics ? (
              <p className="admin-dash__empty">{refreshing ? "Loading…" : "No data"}</p>
            ) : metrics.recent.length === 0 ? (
              <p className="admin-dash__empty">No events yet</p>
            ) : (
              <ul className="admin-dash__stream">
                {metrics.recent.map((ev, i) => (
                  <li key={`${ev.at}-${i}`}>
                    <time className="admin-dash__stream-time">
                      {new Date(ev.at).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                    <span className="admin-dash__stream-event">{ev.eventName}</span>
                    {ev.day != null ? (
                      <span className="admin-dash__stream-day">
                        day {String(ev.day).padStart(2, "0")}
                      </span>
                    ) : null}
                    {ev.referrerBucket ? (
                      <span className="admin-dash__stream-meta">{ev.referrerBucket}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            {metrics ? (
              <p className="admin-dash__foot">
                Updated {new Date(metrics.generatedAt).toLocaleString()}
              </p>
            ) : null}
          </section>
        </aside>
      </div>

      <AdminPublishingPanel
        year={schedule?.year ?? new Date().getFullYear()}
        month={schedule?.month ?? 10}
        days={schedule?.days ?? null}
        togglingDay={togglingDay}
        onToggle={(day, approved) => void toggleDayApproved(day, approved)}
        error={scheduleError}
      />
    </AdminShell>
  );
}
