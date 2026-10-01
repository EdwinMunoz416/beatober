"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import { workspaceBgForDay } from "@/lib/day-playback-background";
import { dayPath } from "@/lib/day-routes";
import type { Manifest } from "@/lib/content";
import {
  defaultSelectedDay,
  isDayLocked,
  type BeatoberCalendar,
} from "@/lib/day-access";
import { DayOptionWheel } from "@/components/DayOptionWheel";
import { LockedDayPanel } from "@/components/LockedDayPanel";
import { BeatAudio } from "@/components/BeatAudio";
import { StrudelErrorBoundary } from "@/components/StrudelErrorBoundary";
import { StrudelRepl } from "@/components/StrudelRepl";
import { StrudelVisualBootstrap } from "@/components/StrudelVisualBootstrap";
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
  const [playbackWorkspaceBg, setPlaybackWorkspaceBg] = useState<
    string | undefined
  >(undefined);
  const days = manifest.days;

  const handleStrudelPlayback = useCallback(
    (playing: boolean, day: number) => {
      const url = workspaceBgForDay(day);
      setPlaybackWorkspaceBg(playing && url ? url : undefined);
    },
    [],
  );

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
  const showStrudel = !viewLocked || canPublish;
  const publishedCode = patterns[entry.day] ?? "";
  const hydraEnabled = !viewLocked;

  return (
    <div
      className={`beatober-page${hydraEnabled ? " beatober-page--hydra" : ""}${!viewLocked ? " beatober-page--strudel-draw" : ""}`}
    >
      {!viewLocked ? <StrudelVisualBootstrap /> : null}
      <div
        className={`beatober-workspace${playbackWorkspaceBg ? " beatober-workspace--playback-bg" : ""}`}
        style={
          playbackWorkspaceBg
            ? ({
                ["--workspace-playback-bg" as string]: `url("${playbackWorkspaceBg}")`,
              } as CSSProperties)
            : undefined
        }
      >
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
          {entry.audioUrl ? (
            <BeatAudio
              day={entry.day}
              audioUrl={entry.audioUrl}
              title={entry.title}
            />
          ) : null}
          {showStrudel ? (
            <StrudelErrorBoundary>
              <StrudelRepl
                day={entry.day}
                publishedCode={publishedCode}
                comingSoon={viewLocked && canPublish}
                canPublish={canPublish}
                onPlaybackChange={handleStrudelPlayback}
              />
            </StrudelErrorBoundary>
          ) : (
            <LockedDayPanel
              day={entry.day}
              title={entry.title}
              month={calendar.month}
            />
          )}
        </div>
      </div>
    </div>
  );
}
