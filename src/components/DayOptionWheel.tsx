"use client";

import { useMemo, type ReactNode } from "react";
import type { DayEntry } from "@/lib/content";
import type { BeatoberCalendar } from "@/lib/day-access";
import { isDayLocked } from "@/lib/day-access";
import OptionWheel from "@/components/OptionWheel/OptionWheel";

type Props = {
  days: DayEntry[];
  calendar: BeatoberCalendar;
  nowIso: string;
  authorMode: boolean;
  focusDay: number;
  onFocusDay: (day: number) => void;
  header?: ReactNode;
};

export function DayOptionWheel({
  days,
  calendar,
  nowIso,
  authorMode,
  focusDay,
  onFocusDay,
  header,
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

  const focusIndex = Math.max(
    0,
    sorted.findIndex((d) => d.day === focusDay),
  );

  return (
    <nav className="day-wheel-panel" aria-label="October days">
      {header ? <div className="day-wheel-playback">{header}</div> : null}
      <OptionWheel
        className="beatober-day-wheel"
        items={labels}
        selected={focusIndex}
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
        onChange={(index) => {
          const entry = sorted[index];
          if (!entry) return;
          onFocusDay(entry.day);
        }}
        itemClassName={(index) =>
          lockedByIndex[index] ? "option-wheel__item--locked" : undefined
        }
      />
      <p className="day-wheel-hint">Scroll or drag · ↑↓</p>
    </nav>
  );
}
