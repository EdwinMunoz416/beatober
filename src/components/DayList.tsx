"use client";

import type { DayEntry } from "@/lib/content";
import type { BeatoberCalendar } from "@/lib/day-access";
import { isDayLocked } from "@/lib/day-access";

type Props = {
  days: DayEntry[];
  calendar: BeatoberCalendar;
  nowIso: string;
  authorMode: boolean;
  selectedDay: number;
  onSelect: (day: number) => void;
  onLockedDay?: (day: number) => void;
};

export function DayList({
  days,
  calendar,
  nowIso,
  authorMode,
  selectedDay,
  onSelect,
  onLockedDay,
}: Props) {
  const now = new Date(nowIso);

  return (
    <nav className="day-list" aria-label="October days">
      <ol className="day-list-inner">
        {days.map((d) => {
          const locked = isDayLocked(
            d.day,
            d.approved,
            calendar,
            now,
            authorMode,
          );
          const lockedForPublic = isDayLocked(
            d.day,
            d.approved,
            calendar,
            now,
            false,
          );
          const selected = d.day === selectedDay;
          const canSelect = authorMode || !locked;

          return (
            <li key={d.day}>
              <button
                type="button"
                className={[
                  "day-chip",
                  selected ? "day-chip--selected" : "",
                  locked ? "day-chip--locked" : "",
                  d.approved ? "day-chip--approved" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-current={selected ? "true" : undefined}
                aria-disabled={locked && !authorMode ? true : undefined}
                title={
                  locked
                    ? authorMode
                      ? "Draft — not approved or not release day"
                      : "Locked until approved and release day"
                    : d.title ?? `Day ${d.day}`
                }
                onClick={() => {
                  if (canSelect) onSelect(d.day);
                  else onLockedDay?.(d.day);
                }}
              >
                <span className="day-chip-num">{String(d.day).padStart(2, "0")}</span>
                <span className="day-chip-theme">
                  {d.title ?? `day ${d.day}`}
                </span>
                {lockedForPublic ? (
                  <span className="day-chip-lock" aria-hidden>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="5" y="11" width="14" height="10" rx="1" />
                      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                    </svg>
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
