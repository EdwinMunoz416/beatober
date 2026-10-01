"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  setCachedAudience,
  type ClientAudience,
} from "@/lib/analytics-audience-client";
import { getVisitorId } from "@/lib/visitor-id";
import { AdminLoginForm } from "@/components/AdminLoginForm";

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
      <div className="ctrl-page">
        <header className="ctrl-header">
          <h1 className="ctrl-title">devices</h1>
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

  return (
    <div className="ctrl-page">
      <header className="ctrl-header">
        <div>
          <h1 className="ctrl-title">devices</h1>
          <p className="ctrl-subtitle">register · ignore · internal</p>
        </div>
        <div className="ctrl-header-actions">
          <Link href="/admin" className="ctrl-link">
            control room
          </Link>
          <Link href="/" className="ctrl-link">
            site
          </Link>
        </div>
      </header>

      <section className="ctrl-panel">
        <h2 className="ctrl-panel-title">This browser</h2>
        <div className="ctrl-device-form">
          <p className="ctrl-note ctrl-mono-id">{thisId || "…"}</p>
          <label className="ctrl-field">
            <span>Role</span>
            <select
              className="ctrl-input"
              value={role}
              onChange={(e) =>
                setRole(e.target.value as "internal" | "ignore")
              }
            >
              <option value="internal">Internal (track separately)</option>
              <option value="ignore">Ignore (no tracking)</option>
            </select>
          </label>
          <label className="ctrl-field">
            <span>Label (optional)</span>
            <input
              className="ctrl-input"
              placeholder="macbook-chrome"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </label>
          <button type="button" className="ctrl-btn" onClick={() => void registerThis()}>
            Save this device
          </button>
          {msg ? <p className="ctrl-note">{msg}</p> : null}
          {err ? <p className="ctrl-error">{err}</p> : null}
        </div>
      </section>

      <section className="ctrl-panel">
        <h2 className="ctrl-panel-title">Registered</h2>
        <ul className="ctrl-device-list">
          {devices.length === 0 ? (
            <li className="ctrl-empty">No devices registered yet</li>
          ) : (
            devices.map((d) => (
              <li key={d.visitorId}>
                <span className="ctrl-mono-id">{d.visitorId.slice(0, 12)}…</span>
                <span className="ctrl-stream-event">{d.role}</span>
                {d.label ? <span>{d.label}</span> : null}
                <button
                  type="button"
                  className="ctrl-btn ctrl-btn--ghost"
                  onClick={() => void remove(d.visitorId)}
                >
                  Remove
                </button>
              </li>
            ))
          )}
        </ul>
        <p className="ctrl-note ctrl-device-foot">
          Remove resets device to visitor. Re-open site on that device after
          remove to refresh cache.
        </p>
      </section>
    </div>
  );
}
