"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { dayPath } from "@/lib/day-routes";
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
  initialSelectedDay?: number;
};

export function BeatoberHome({
  manifest,
  patterns,
  nowIso,
  authorMode,
  initialSelectedDay,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const calendar: BeatoberCalendar = {
    year: manifest.year,
    month: manifest.month,
  };

  const initialDay = useMemo(() => {
    if (
      initialSelectedDay !== undefined &&
      initialSelectedDay >= 1 &&
      initialSelectedDay <= 31
    ) {
      return initialSelectedDay;
    }
    return defaultSelectedDay(
      manifest.days,
      calendar,
      new Date(nowIso),
      authorMode,
    );
  }, [manifest.days, calendar, nowIso, authorMode, initialSelectedDay]);

  const [selectedDay, setSelectedDay] = useState(initialDay);
  const [days, setDays] = useState<DayEntry[]>(manifest.days);

  useEffect(() => {
    setSelectedDay(initialDay);
  }, [initialDay]);

  const selectDay = (day: number) => {
    setSelectedDay(day);
    const target = dayPath(day);
    if (pathname !== target) {
      router.push(target);
    }
  };

  useEffect(() => {
    trackEvent("page_view", {
      surface: pathname.startsWith("/day/") ? "day" : "home",
    });
  }, [pathname]);

  useEffect(() => {
    trackEvent("day_view", { day: selectedDay });
    trackEvent("day_select", { day: selectedDay });
  }, [selectedDay]); // once per selection / initial day

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
    router.refresh();
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
          onLockedDay={(day) =>
            trackEvent("day_locked_interaction", { day })
          }
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
