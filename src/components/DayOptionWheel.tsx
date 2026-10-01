"use client";

import { useMemo } from "react";
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
};

export function DayOptionWheel({
  days,
  calendar,
  nowIso,
  authorMode,
  focusDay,
  onFocusDay,
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
      <OptionWheel
        className="beatober-day-wheel"
        items={labels}
        selected={focusIndex}
        loop
        fontSize={1.64}
        spacing={3.1}
        tilt={0}
        curve={0.85}
        blur={2.4}
        fade={0.165}
        inset={12}
        textColor="#a6a6a6"
        activeColor="#ffffff"
        soundUrl=""
        soundVolume={0}
        onChange={(index) => {
          const entry = sorted[index];
          if (!entry) return;
          onFocusDay(entry.day);
        }}
        itemClassName={(index) =>
          lockedByIndex[index] ? "option-wheel__item--locked" : undefined
        }
      />
    </nav>
  );
}
