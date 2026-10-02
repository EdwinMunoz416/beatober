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
import { bindLockedDayScroll } from "@/lib/analytics-locked-scroll";
import { flushBeatListen } from "@/lib/analytics-beat-listen";
import {
  flushPageEngagementForDayChange,
  syncPageEngagement,
} from "@/lib/analytics-page-engagement";
import { recordSessionLanding } from "@/lib/analytics-landing";
import { trackEvent } from "@/lib/analytics";
import {
  setVisitorActivity,
  trackVisitorPresence,
} from "@/lib/analytics-presence";
import { stopStrudelForDayChange } from "@/lib/strudel-playback-control";
import { useDayPattern } from "@/lib/use-day-pattern";
import { useVisitorPresence } from "@/lib/use-visitor-presence";

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

  const presenceDay = viewDay >= 1 && viewDay <= 31 ? viewDay : null;

  const pingPresence = useCallback(() => {
    trackVisitorPresence({ path: pathname, day: presenceDay });
  }, [pathname, presenceDay]);

  useVisitorPresence(pathname, viewDay);

  const handleStrudelPlayback = useCallback(
    (playing: boolean, day: number) => {
      const url = workspaceBgForDay(day);
      setPlaybackWorkspaceBg(playing && url ? url : undefined);
      setVisitorActivity(playing ? "listening_strudel" : "browsing");
      trackVisitorPresence({
        path: pathname,
        day: day >= 1 && day <= 31 ? day : null,
      });
    },
    [pathname],
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
    flushBeatListen("day_change");
    flushPageEngagementForDayChange();
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
    const landing = recordSessionLanding(pathname);
    trackEvent("page_view", {
      surface: pathname.startsWith("/day/") ? "day" : "home",
      ...landing,
    });
  }, [pathname]);

  useEffect(() => {
    trackEvent("day_view", { day: viewDay });
    trackEvent("day_select", { day: viewDay });
  }, [viewDay]);

  useEffect(() => {
    syncPageEngagement({
      surface: pathname.startsWith("/day/") ? "day" : "home",
      day: viewDay,
      path: pathname,
    });
  }, [pathname, viewDay]);

  const entry = days.find((d) => d.day === viewDay) ?? days[0]!;
  const viewLocked = isDayLocked(
    entry.day,
    entry.approved,
    calendar,
    now,
    canPublish,
  );

  useEffect(() => {
    if (!viewLocked) return;
    return bindLockedDayScroll(entry.day);
  }, [viewLocked, entry.day]);

  useEffect(() => {
    if (viewLocked && !canPublish) {
      setVisitorActivity("locked_day");
      pingPresence();
    }
  }, [viewLocked, canPublish, pingPresence]);

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
      <StudioDazeHeader />
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
        <div className="site-header-spacer" aria-hidden />
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
              idleActivity={
                viewLocked && !canPublish ? "locked_day" : "browsing"
              }
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
