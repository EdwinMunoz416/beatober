"use client";

import { useEffect, useRef } from "react";
import { trackBeatLoopComplete } from "@/lib/analytics-beat-loop";
import { trackBeatPlay } from "@/lib/analytics-beat-play";
import {
  ensureBeatListenPageHandlers,
  flushBeatListen,
  startBeatListen,
} from "@/lib/analytics-beat-listen";
import { trackEvent } from "@/lib/analytics";
import {
  setVisitorActivity,
  trackVisitorPresence,
  type VisitorActivity,
} from "@/lib/analytics-presence";
import { usePathname } from "next/navigation";

type Props = {
  day: number;
  audioUrl: string;
  title?: string;
  idleActivity?: VisitorActivity;
};

export function BeatAudio({
  day,
  audioUrl,
  title,
  idleActivity = "browsing",
}: Props) {
  const pathname = usePathname();
  const playedRef = useRef(false);
  const loopsRef = useRef(0);

  const restoreIdleActivity = () => {
    setVisitorActivity(idleActivity);
    trackVisitorPresence({
      path: pathname,
      day: day >= 1 && day <= 31 ? day : null,
    });
  };

  useEffect(() => {
    ensureBeatListenPageHandlers();
    return () => {
      flushBeatListen("unmount");
    };
  }, [day]);

  return (
    <div className="beat-audio">
      <span className="beat-audio-label">beat</span>
      <audio
        controls
        preload="metadata"
        src={audioUrl}
        aria-label={title ?? `Beat day ${day}`}
        onPlay={() => {
          setVisitorActivity("listening_audio");
          trackVisitorPresence({
            path: pathname,
            day: day >= 1 && day <= 31 ? day : null,
          });
          startBeatListen(day, "audio");
          if (!playedRef.current) {
            playedRef.current = true;
            trackBeatPlay(day, "audio");
          } else {
            trackBeatPlay(day, "audio", { repeat: true });
          }
        }}
        onPause={() => {
          flushBeatListen("pause");
          restoreIdleActivity();
        }}
        onEnded={() => {
          flushBeatListen("ended");
          loopsRef.current += 1;
          trackBeatLoopComplete(day, "audio", loopsRef.current);
          trackEvent("beat_ended", { day });
          restoreIdleActivity();
        }}
        onError={() => {
          flushBeatListen("error");
          trackEvent("beat_error", { day });
          restoreIdleActivity();
        }}
      />
    </div>
  );
}
