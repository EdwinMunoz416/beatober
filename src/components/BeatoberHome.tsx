"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
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
import { StrudelWarmBoot } from "@/components/StrudelWarmBoot";
import { StudioDazeHeader } from "@/components/StudioDazeHeader";
import { trackEvent } from "@/lib/analytics";
import { stopStrudelForDayChange } from "@/lib/strudel-playback-control";
import { useDayPattern } from "@/lib/use-day-pattern";

type Props = {
  manifest: Manifest;
  patterns: Record<number, string>;
  nowIso: string;
  canPublish: boolean;
  initialSelectedDay: number;
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
  const calendar: BeatoberCalendar = useMemo(
    () => ({
      year: manifest.year,
      month: manifest.month,
    }),
    [manifest.year, manifest.month],
  );

  const initialDay = useMemo(() => {
    if (
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
  const [prevInitialDay, setPrevInitialDay] = useState(initialDay);
  if (initialDay !== prevInitialDay) {
    setPrevInitialDay(initialDay);
    setViewDay(initialDay);
  }
  const [playbackWorkspaceBg, setPlaybackWorkspaceBg] = useState<
    string | undefined
  >(undefined);
  const [prevInitialForBg, setPrevInitialForBg] = useState(initialDay);
  if (initialDay !== prevInitialForBg) {
    setPrevInitialForBg(initialDay);
    setPlaybackWorkspaceBg(undefined);
  }
  const days = manifest.days;
  const prevInitialStopRef = useRef(initialDay);

  const handleStrudelPlayback = useCallback(
    (playing: boolean, day: number) => {
      const url = workspaceBgForDay(day);
      setPlaybackWorkspaceBg(playing && url ? url : undefined);
    },
    [],
  );

  useEffect(() => {
    if (prevInitialStopRef.current === initialDay) return;
    stopStrudelForDayChange();
    prevInitialStopRef.current = initialDay;
  }, [initialDay]);

  const now = new Date(nowIso);

  const pushPlayableDay = (day: number) => {
    const target = dayPath(day);
    if (pathname !== target) {
      router.push(target);
    }
  };

  const handleFocusDay = (day: number) => {
    if (day === viewDay) return;
    stopStrudelForDayChange();
    setPlaybackWorkspaceBg(undefined);
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
  const {
    code: publishedCode,
    loading: patternLoading,
    error: patternError,
    retry: retryPattern,
  } = useDayPattern({
    viewDay: entry.day,
    initialPatterns: patterns,
    enabled: showStrudel,
  });
  const hydraEnabled = !viewLocked;

  return (
    <div
      className={`beatober-page${hydraEnabled ? " beatober-page--hydra" : ""}${!viewLocked ? " beatober-page--strudel-draw" : ""}`}
    >
      {!viewLocked ? (
        <>
          <StrudelVisualBootstrap />
          <StrudelWarmBoot />
        </>
      ) : null}
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
              key={entry.day}
              day={entry.day}
              audioUrl={entry.audioUrl}
              title={entry.title}
            />
          ) : null}
          {showStrudel ? (
            <StrudelErrorBoundary>
              <StrudelRepl
                key={entry.day}
                day={entry.day}
                publishedCode={publishedCode}
                patternLoading={patternLoading}
                patternError={patternError}
                onRetryPattern={retryPattern}
                comingSoon={viewLocked && canPublish}
                canPublish={canPublish}
                onPlaybackChange={handleStrudelPlayback}
              />
            </StrudelErrorBoundary>
          ) : (
            <LockedDayPanel day={entry.day} title={entry.title} />
          )}
        </div>
      </div>
    </div>
  );
}
