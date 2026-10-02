"use client";

import { useEffect, useMemo, useState } from "react";
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
  const [mobileLayout, setMobileLayout] = useState(false);
  const [wheelResetKey, setWheelResetKey] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const sync = () => setMobileLayout(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

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

  const lockedByIndex = useMemo(() => {
    const now = new Date(nowIso);
    return sorted.map((d) =>
      isDayLocked(d.day, d.approved, calendar, now, authorMode),
    );
  }, [sorted, calendar, nowIso, authorMode]);

  const focusIndex = Math.max(
    0,
    sorted.findIndex((d) => d.day === focusDay),
  );

  return (
    <nav className="day-wheel-panel" aria-label="October days">
      <OptionWheel
        className="beatober-day-wheel"
        centerLabels
        items={labels}
        selected={focusIndex}
        resetKey={wheelResetKey}
        loop
        fontSize={mobileLayout ? 0.88 : 1.64}
        spacing={mobileLayout ? 2.15 : 3.1}
        tilt={mobileLayout ? 2.5 : 6}
        curve={mobileLayout ? 0.12 : 0.85}
        blur={mobileLayout ? 2 : 2.4}
        fade={mobileLayout ? 0.2 : 0.165}
        inset={mobileLayout ? 0 : 12}
        textColor="#a6a6a6"
        activeColor="#ffffff"
        soundUrl=""
        soundVolume={0}
        commitChange={(index) => {
          if (lockedByIndex[index]) {
            setWheelResetKey((k) => k + 1);
            return false;
          }
          return true;
        }}
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
