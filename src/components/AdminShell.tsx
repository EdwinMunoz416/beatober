"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type NavId = "metrics" | "devices";

type Props = {
  active: NavId;
  title: string;
  subtitle?: string;
  toolbar?: ReactNode;
  onLogout: () => void;
  children: ReactNode;
};

const NAV: { id: NavId; href: string; label: string; hint: string }[] = [
  { id: "metrics", href: "/admin", label: "Metrics", hint: "visitor profiles" },
  { id: "devices", href: "/admin/devices", label: "Devices", hint: "internal · ignore" },
];

export function AdminShell({
  active,
  title,
  subtitle,
  toolbar,
  onLogout,
  children,
}: Props) {
  return (
    <div className="admin-dash">
      <aside className="admin-dash__nav" aria-label="Admin sections">
        <Link href="/" className="admin-dash__brand">
          studio-daze
          <span className="admin-dash__brand-sub">beatober admin</span>
        </Link>
        <nav className="admin-dash__nav-list">
          {NAV.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={`admin-dash__nav-link${active === item.id ? " admin-dash__nav-link--active" : ""}`}
              aria-current={active === item.id ? "page" : undefined}
            >
              <span className="admin-dash__nav-label">{item.label}</span>
              <span className="admin-dash__nav-hint">{item.hint}</span>
            </Link>
          ))}
        </nav>
        <div className="admin-dash__nav-foot">
          <button
            type="button"
            className="admin-dash__btn admin-dash__btn--ghost admin-dash__btn--block"
            onClick={onLogout}
          >
            Log out
          </button>
        </div>
      </aside>

      <div className="admin-dash__main">
        <header className="admin-dash__header">
          <div className="admin-dash__header-text">
            <h1 className="admin-dash__title">{title}</h1>
            {subtitle ? <p className="admin-dash__subtitle">{subtitle}</p> : null}
          </div>
          {toolbar ? (
            <div className="admin-dash__toolbar">{toolbar}</div>
          ) : null}
        </header>
        <div className="admin-dash__content">{children}</div>
      </div>
    </div>
  );
}

export function AdminLoginPage({
  title,
  error,
  password,
  onPasswordChange,
  onSubmit,
}: {
  title: string;
  error: string | null;
  password: string;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="admin-dash admin-dash--login">
      <div className="admin-dash__login-card">
        <Link href="/" className="admin-dash__brand admin-dash__brand--center">
          studio-daze
          <span className="admin-dash__brand-sub">beatober admin</span>
        </Link>
        <h1 className="admin-dash__login-title">{title}</h1>
        <p className="admin-dash__login-note">Use your BEATOBER_AUTHOR_SECRET.</p>
        <input
          type="password"
          className="admin-dash__input"
          placeholder="password"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          autoComplete="current-password"
        />
        <button type="button" className="admin-dash__btn" onClick={onSubmit}>
          Enter
        </button>
        {error ? <p className="admin-dash__error">{error}</p> : null}
        <Link href="/" className="admin-dash__back-link">
          ← back to site
        </Link>
      </div>
    </div>
  );
}
