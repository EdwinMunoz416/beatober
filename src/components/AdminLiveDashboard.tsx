"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell, AdminLoginPage } from "@/components/AdminShell";
import { formatGeoChip } from "@/lib/geo-display";
import type { LiveSnapshot } from "@/lib/analytics-live";
import type { LiveAudience } from "@/lib/analytics-live";
import { formatLiveActivity } from "@/lib/live-activity-display";
import { formatReferrerSource } from "@/lib/referrer-display";
import { VisitorAvatar } from "@/components/VisitorAvatar";
import { profileDisplayName } from "@/lib/visitor-profile-ui";

type Props = {
  initialAuthed: boolean;
};

export function AdminLiveDashboard({ initialAuthed }: Props) {
  const [authed, setAuthed] = useState(initialAuthed);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [audience, setAudience] = useState<LiveAudience>("visitor");
  const [snapshot, setSnapshot] = useState<LiveSnapshot | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);

  const load = useCallback(async () => {
    if (!authed) return;
    setPolling(true);
    setLoadError(null);
    try {
      const res = await fetch(
        `/api/admin/live?audience=${encodeURIComponent(audience)}`,
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
      setSnapshot((await res.json()) as LiveSnapshot);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err));
    } finally {
      setPolling(false);
    }
  }, [authed, audience]);

  useEffect(() => {
    if (!authed) return;
    void load();
    const id = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(id);
  }, [authed, load]);

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
    setSnapshot(null);
  };

  if (!authed) {
    return (
      <AdminLoginPage
        title="Live"
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
        onChange={(e) => setAudience(e.target.value as LiveAudience)}
        aria-label="Audience filter"
      >
        <option value="visitor">Visitors</option>
        <option value="internal">Internal</option>
        <option value="all">All</option>
      </select>
      <button
        type="button"
        className="admin-dash__btn"
        disabled={polling}
        onClick={() => void load()}
      >
        {polling ? "Refreshing…" : "Refresh"}
      </button>
    </>
  );

  return (
    <AdminShell
      active="live"
      title="Live dashboard"
      subtitle="Browsers on the site in the last 2 minutes"
      toolbar={toolbar}
      onLogout={() => void logout()}
    >
      {loadError ? <p className="admin-dash__error">{loadError}</p> : null}

      {snapshot ? (
        <p className="admin-dash__live-meta">
          <span className="admin-dash__live-pulse" aria-hidden />
          {snapshot.activeCount} active
          {snapshot.activeCount === 1 ? " browser" : " browsers"}
          · window {snapshot.windowSeconds}s
          · updated {new Date(snapshot.generatedAt).toLocaleTimeString()}
        </p>
      ) : null}

      {snapshot && !snapshot.dbConfigured ? (
        <p className="admin-dash__error">{snapshot.hint}</p>
      ) : null}

      {snapshot?.hint && snapshot.dbConfigured ? (
        <p className="admin-dash__note admin-dash__note--top">{snapshot.hint}</p>
      ) : null}

      {!snapshot && !loadError ? (
        <p className="admin-dash__empty">Loading live data…</p>
      ) : snapshot && snapshot.visitors.length === 0 ? (
        <p className="admin-dash__empty">
          No active visitors right now. Open the public site in another tab
          (incognito or a non-admin window) to see yourself.
        </p>
      ) : snapshot ? (
        <div className="admin-dash__live-table-wrap">
          <table className="admin-dash__live-table">
            <thead>
              <tr>
                <th scope="col">Last seen</th>
                <th scope="col">Who</th>
                <th scope="col">Activity</th>
                <th scope="col">Page</th>
                <th scope="col">Source</th>
                <th scope="col">Location</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.visitors.map((v) => (
                <tr key={v.visitorId}>
                  <td>
                    {v.secondsAgo < 5 ? "now" : `${v.secondsAgo}s ago`}
                  </td>
                  <td>
                    <div className="admin-dash__live-who">
                      <VisitorAvatar
                        visitorId={v.visitorId}
                        avatarUrl={v.lockedAvatarUrl}
                        alt={profileDisplayName(null, v.lockedNickname)}
                        compact
                      />
                      <span className="admin-dash__live-name">
                        {profileDisplayName(null, v.lockedNickname)}
                      </span>
                    </div>
                    {v.audience !== "visitor" ? (
                      <span className="admin-dash__live-badge">{v.audience}</span>
                    ) : null}
                  </td>
                  <td>
                    <strong>{formatLiveActivity(v.activity)}</strong>
                    {v.day != null ? (
                      <span className="admin-dash__live-day">
                        day {String(v.day).padStart(2, "0")}
                      </span>
                    ) : null}
                  </td>
                  <td>{v.path ?? "—"}</td>
                  <td>
                    {v.referrerSource
                      ? formatReferrerSource(v.referrerSource)
                      : "—"}
                  </td>
                  <td>
                    {v.geoCountry
                      ? formatGeoChip(v.geoCountry, v.geoRegion)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </AdminShell>
  );
}
