"use client";

import { useCallback, useEffect, useState } from "react";
import {
  setCachedAudience,
  type ClientAudience,
} from "@/lib/analytics-audience-client";
import { getVisitorId } from "@/lib/visitor-id";
import { AdminLoginPage, AdminShell } from "@/components/AdminShell";

type Device = {
  visitorId: string;
  role: "internal" | "ignore";
  label: string | null;
  updatedAt: string;
};

type Props = {
  initialAuthed: boolean;
};

export function AdminDevices({ initialAuthed }: Props) {
  const [authed, setAuthed] = useState(initialAuthed);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [thisId, setThisId] = useState("");
  const [role, setRole] = useState<"internal" | "ignore">("internal");
  const [label, setLabel] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setThisId(getVisitorId());
  }, []);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/devices");
    if (res.status === 401) {
      setAuthed(false);
      return;
    }
    if (!res.ok) return;
    const data = (await res.json()) as { devices: Device[] };
    setDevices(data.devices);
  }, []);

  useEffect(() => {
    if (authed) void load();
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
  };

  const registerThis = async () => {
    setErr(null);
    setMsg(null);
    const visitorId = getVisitorId();
    const res = await fetch("/api/admin/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId, role, label: label || undefined }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setErr(data.error ?? "Save failed");
      return;
    }
    const clientRole: ClientAudience =
      role === "ignore" ? "ignore" : "internal";
    setCachedAudience(clientRole, label || null);
    setMsg(
      role === "ignore"
        ? "This browser will not send analytics."
        : "This browser tagged as internal.",
    );
    void load();
  };

  const remove = async (visitorId: string) => {
    await fetch("/api/admin/devices", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId }),
    });
    if (visitorId === getVisitorId()) {
      setCachedAudience("visitor");
    }
    void load();
  };

  if (!authed) {
    return (
      <AdminLoginPage
        title="Devices"
        password={password}
        error={loginError}
        onPasswordChange={setPassword}
        onSubmit={() => void login()}
      />
    );
  }

  return (
    <AdminShell
      active="devices"
      title="Device management"
      subtitle="Tag browsers as internal or exclude them from visitor metrics"
      onLogout={() => void logout()}
    >
      <section className="admin-dash__panel">
        <h2 className="admin-dash__panel-title">This browser</h2>
        <p className="admin-dash__panel-desc">
          Internal events appear under the Internal audience filter on Metrics.
        </p>
        <div className="admin-dash__form-stack">
          <p className="admin-dash__mono">{thisId || "…"}</p>
          <label className="admin-dash__field">
            <span>Role</span>
            <select
              className="admin-dash__input"
              value={role}
              onChange={(e) =>
                setRole(e.target.value as "internal" | "ignore")
              }
            >
              <option value="internal">Internal (track separately)</option>
              <option value="ignore">Ignore (no tracking)</option>
            </select>
          </label>
          <label className="admin-dash__field">
            <span>Label (optional)</span>
            <input
              className="admin-dash__input"
              placeholder="macbook-chrome"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="admin-dash__btn"
            onClick={() => void registerThis()}
          >
            Save this device
          </button>
          {msg ? <p className="admin-dash__note">{msg}</p> : null}
          {err ? <p className="admin-dash__error">{err}</p> : null}
        </div>
      </section>

      <section className="admin-dash__panel admin-dash__panel--spaced">
        <h2 className="admin-dash__panel-title">Registered devices</h2>
        <ul className="admin-dash__device-list">
          {devices.length === 0 ? (
            <li className="admin-dash__empty-cell">No devices registered yet</li>
          ) : (
            devices.map((d) => (
              <li key={d.visitorId}>
                <span className="admin-dash__mono">{d.visitorId.slice(0, 12)}…</span>
                <span className="admin-dash__stream-event">{d.role}</span>
                {d.label ? <span>{d.label}</span> : null}
                <button
                  type="button"
                  className="admin-dash__btn admin-dash__btn--ghost admin-dash__btn--compact"
                  onClick={() => void remove(d.visitorId)}
                >
                  Remove
                </button>
              </li>
            ))
          )}
        </ul>
        <p className="admin-dash__note admin-dash__note--foot">
          Remove resets a device to visitor. Re-open the site on that device after
          remove to refresh cache.
        </p>
      </section>
    </AdminShell>
  );
}
