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
                {locked ? (
                  <span className="day-chip-lock" aria-hidden>
                    ◌
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
