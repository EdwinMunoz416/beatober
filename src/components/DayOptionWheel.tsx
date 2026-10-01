"use client";

import { useCallback, useMemo } from "react";
import type { DayEntry } from "@/lib/content";
import type { BeatoberCalendar } from "@/lib/day-access";
import { isDayLocked } from "@/lib/day-access";
import OptionWheel from "@/components/OptionWheel/OptionWheel";

type Props = {
  days: DayEntry[];
  calendar: BeatoberCalendar;
  nowIso: string;
  authorMode: boolean;
  selectedDay: number;
  onSelect: (day: number) => void;
  onLockedDay?: (day: number) => void;
};

export function DayOptionWheel({
  days,
  calendar,
  nowIso,
  authorMode,
  selectedDay,
  onSelect,
  onLockedDay,
}: Props) {
  const now = new Date(nowIso);
  const sorted = useMemo(
    () => [...days].sort((a, b) => a.day - b.day),
    [days],
  );

  const labels = useMemo(
    () =>
      sorted.map((d) => {
        const pad = String(d.day).padStart(2, "0");
        const theme = d.title ?? `day ${d.day}`;
        return `${pad}  ${theme}`;
      }),
    [sorted],
  );

  const lockedByIndex = useMemo(
    () =>
      sorted.map((d) =>
        isDayLocked(d.day, d.approved, calendar, now, false),
      ),
    [sorted, calendar, now],
  );

  const selectedIndex = Math.max(
    0,
    sorted.findIndex((d) => d.day === selectedDay),
  );

  const isLockedIndex = useCallback(
    (index: number) => {
      const entry = sorted[index];
      if (!entry) return true;
      return isDayLocked(
        entry.day,
        entry.approved,
        calendar,
        now,
        authorMode,
      );
    },
    [sorted, calendar, now, authorMode],
  );

  return (
    <nav className="day-wheel-panel" aria-label="October days">
      <OptionWheel
        className="beatober-day-wheel"
        items={labels}
        selected={selectedIndex}
        loop={false}
        fontSize={0.82}
        spacing={1.55}
        tilt={5}
        curve={0.85}
        blur={1.2}
        fade={0.22}
        inset={12}
        textColor="#8b919e"
        activeColor="#5ef0ff"
        commitChange={(index) => !isLockedIndex(index)}
        onChange={(index) => {
          const entry = sorted[index];
          if (!entry) return;
          onSelect(entry.day);
        }}
        itemClassName={(index) =>
          lockedByIndex[index] ? "option-wheel__item--locked" : undefined
        }
      />
      <p className="day-wheel-hint">Scroll or drag · ↑↓ · locked = preview only</p>
    </nav>
  );
}
