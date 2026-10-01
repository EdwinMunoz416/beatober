"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { dayPath } from "@/lib/day-routes";
import type { DayEntry, Manifest } from "@/lib/content";
import {
  defaultSelectedDay,
  isDayLocked,
  type BeatoberCalendar,
} from "@/lib/day-access";
import { comingSoonPattern } from "@/lib/coming-soon-pattern";
import { DayOptionWheel } from "@/components/DayOptionWheel";
import { BeatAudio } from "@/components/BeatAudio";
import { StrudelRepl } from "@/components/StrudelRepl";
import { StudioDazeHeader } from "@/components/StudioDazeHeader";
import { trackEvent } from "@/lib/analytics";

type Props = {
  manifest: Manifest;
  patterns: Record<number, string>;
  nowIso: string;
  canPublish: boolean;
  initialSelectedDay?: number;
};

export function BeatoberHome({
  manifest,
  patterns,
  nowIso,
  canPublish,
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
      canPublish,
    );
  }, [manifest.days, calendar, nowIso, canPublish, initialSelectedDay]);

  const [viewDay, setViewDay] = useState(initialDay);
  const [days, setDays] = useState<DayEntry[]>(manifest.days);

  useEffect(() => {
    setViewDay(initialDay);
  }, [initialDay]);

  const now = new Date(nowIso);

  const pushPlayableDay = (day: number) => {
    const target = dayPath(day);
    if (pathname !== target) {
      router.push(target);
    }
  };

  const handleFocusDay = (day: number) => {
    setViewDay(day);
    const entry = days.find((d) => d.day === day);
    const locked = isDayLocked(
      day,
      entry?.approved ?? false,
      calendar,
      now,
      canPublish,
    );
    if (locked) {
      trackEvent("day_locked_interaction", { day });
      return;
    }
    pushPlayableDay(day);
  };

  useEffect(() => {
    trackEvent("page_view", {
      surface: pathname.startsWith("/day/") ? "day" : "home",
    });
  }, [pathname]);

  useEffect(() => {
    trackEvent("day_view", { day: viewDay });
    trackEvent("day_select", { day: viewDay });
  }, [viewDay]);

  const entry = days.find((d) => d.day === viewDay) ?? days[0]!;
  const viewLocked = isDayLocked(
    entry.day,
    entry.approved,
    calendar,
    now,
    canPublish,
  );
  const publishedCode = viewLocked
    ? comingSoonPattern(entry.day, entry.title)
    : (patterns[entry.day] ?? "");
  const remixMode = !viewLocked && !canPublish;
  const hydraEnabled = !viewLocked;

  const toggleApprove = async () => {
    const next = !entry.approved;
    const res = await fetch(`/api/day/${entry.day}/approve`, {
      method: "POST",
      credentials: "include",
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
    <div
      className={`beatober-page${hydraEnabled ? " beatober-page--hydra" : ""}`}
    >
      <div className="beatober-workspace">
        <StudioDazeHeader />
        <DayOptionWheel
          days={days}
          calendar={calendar}
          nowIso={nowIso}
          authorMode={canPublish}
          focusDay={viewDay}
          onFocusDay={handleFocusDay}
        />
        <div className="beatober-main">
          {canPublish ? (
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
          {entry.audioUrl && !viewLocked ? (
            <BeatAudio
              day={entry.day}
              audioUrl={entry.audioUrl}
              title={entry.title}
            />
          ) : null}
          <StrudelRepl
            day={entry.day}
            publishedCode={publishedCode}
            comingSoon={viewLocked}
            canPublish={canPublish}
            remixMode={remixMode}
          />
        </div>
      </div>
    </div>
  );
}
