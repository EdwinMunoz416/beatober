"use client";

import { useEffect, useMemo, useState } from "react";
import type { DayEntry, Manifest } from "@/lib/content";
import { defaultSelectedDay, type BeatoberCalendar } from "@/lib/day-access";
import { DayList } from "@/components/DayList";
import { BeatAudio } from "@/components/BeatAudio";
import { StrudelRepl } from "@/components/StrudelRepl";
import { StudioDazeHeader } from "@/components/StudioDazeHeader";
import { trackEvent } from "@/lib/analytics";

type Props = {
  manifest: Manifest;
  patterns: Record<number, string>;
  nowIso: string;
  authorMode: boolean;
};

export function BeatoberHome({
  manifest,
  patterns,
  nowIso,
  authorMode,
}: Props) {
  const calendar: BeatoberCalendar = {
    year: manifest.year,
    month: manifest.month,
  };

  const initialDay = useMemo(
    () =>
      defaultSelectedDay(manifest.days, calendar, new Date(nowIso), authorMode),
    [manifest.days, calendar, nowIso, authorMode],
  );

  const [selectedDay, setSelectedDay] = useState(initialDay);
  const [days, setDays] = useState<DayEntry[]>(manifest.days);

  const selectDay = (day: number) => {
    setSelectedDay(day);
    trackEvent("day_view", { day });
  };

  useEffect(() => {
    trackEvent("day_view", { day: initialDay });
  }, [initialDay]);

  const now = new Date(nowIso);
  const entry = days.find((d) => d.day === selectedDay) ?? days[0]!;
  const replReadOnly = !authorMode;

  const toggleApprove = async () => {
    const next = !entry.approved;
    const res = await fetch(`/api/day/${entry.day}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved: next }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      alert(data.error ?? "Could not update approval");
      return;
    }
    setDays((prev) =>
      prev.map((d) =>
        d.day === entry.day ? { ...d, approved: next } : d,
      ),
    );
  };

  return (
    <div className="beatober-page">
      <StudioDazeHeader />
      <div className="beatober-workspace">
        <DayList
          days={days}
          calendar={calendar}
          nowIso={nowIso}
          authorMode={authorMode}
          selectedDay={selectedDay}
          onSelect={selectDay}
        />
        <div className="beatober-main">
          {authorMode ? (
            <div className="author-bar">
              <span className="author-badge">Author</span>
              <button
                type="button"
                className="author-approve"
                onClick={() => void toggleApprove()}
              >
                {entry.approved ? "Revoke approval" : "Approve day"}
              </button>
              <span className="author-note">
                Public unlock: approved + calendar day {entry.day}
              </span>
            </div>
          ) : null}
          {entry.audioUrl ? (
            <BeatAudio
              day={entry.day}
              audioUrl={entry.audioUrl}
              title={entry.title}
            />
          ) : null}
          <StrudelRepl
            day={entry.day}
            initialCode={patterns[entry.day] ?? ""}
            readOnly={replReadOnly}
            authorMode={authorMode}
          />
        </div>
      </div>
    </div>
  );
}
