"use client";

import Link from "next/link";
import {
  isDayLocked,
  type BeatoberCalendar,
} from "@/lib/day-access";

export type AdminDay = {
  day: number;
  title?: string;
  approved: boolean;
  audioUrl: string | null;
};

type Props = {
  year: number;
  month: number;
  days: AdminDay[] | null;
  togglingDay: number | null;
  onToggle: (day: number, approved: boolean) => void;
  error: string | null;
};

function publicStatus(
  entry: AdminDay,
  calendar: BeatoberCalendar,
  now: Date,
): string {
  if (isDayLocked(entry.day, entry.approved, calendar, now, false)) {
    if (!entry.approved) return "Not approved";
    return "Scheduled";
  }
  return "Live";
}

export function AdminPublishingPanel({
  year,
  month,
  days,
  togglingDay,
  onToggle,
  error,
}: Props) {
  const calendar: BeatoberCalendar = { year, month };
  const now = new Date();

  return (
    <details className="admin-dash__secondary">
      <summary className="admin-dash__secondary-summary">
        <span className="admin-dash__secondary-title">Publishing &amp; approvals</span>
        <span className="admin-dash__secondary-hint">
          calendar unlock · approve day posts
        </span>
      </summary>
      <div className="admin-dash__secondary-body">
        {error ? <p className="admin-dash__error">{error}</p> : null}
        <p className="admin-dash__note">
          Visitors see a day when it is approved and its calendar date has arrived.
        </p>
        <div className="admin-dash__table-wrap">
          <table className="admin-dash__table">
            <thead>
              <tr>
                <th>Day</th>
                <th>Title</th>
                <th>Status</th>
                <th>Beat</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {!days ? (
                <tr>
                  <td colSpan={5} className="admin-dash__empty-cell">
                    Loading…
                  </td>
                </tr>
              ) : (
                days.map((row) => (
                  <tr key={row.day}>
                    <td>
                      <Link href={`/day/${row.day}`} className="admin-dash__link">
                        {String(row.day).padStart(2, "0")}
                      </Link>
                    </td>
                    <td>{row.title ?? "—"}</td>
                    <td>{publicStatus(row, calendar, now)}</td>
                    <td>{row.audioUrl ? "yes" : "—"}</td>
                    <td className="admin-dash__table-action">
                      <button
                        type="button"
                        className="admin-dash__btn admin-dash__btn--compact"
                        disabled={togglingDay === row.day}
                        onClick={() => void onToggle(row.day, !row.approved)}
                      >
                        {togglingDay === row.day
                          ? "…"
                          : row.approved
                            ? "Revoke"
                            : "Approve"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </details>
  );
}
