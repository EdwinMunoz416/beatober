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

type Props = {
  day: number;
  audioUrl: string;
  title?: string;
};

export function BeatAudio({ day, audioUrl, title }: Props) {
  const playedRef = useRef(false);
  const loopsRef = useRef(0);

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
          startBeatListen(day, "audio");
          if (!playedRef.current) {
            playedRef.current = true;
            trackBeatPlay(day, "audio");
          } else {
            trackBeatPlay(day, "audio", { repeat: true });
          }
        }}
        onPause={() => flushBeatListen("pause")}
        onEnded={() => {
          flushBeatListen("ended");
          loopsRef.current += 1;
          trackBeatLoopComplete(day, "audio", loopsRef.current);
          trackEvent("beat_ended", { day });
        }}
        onError={() => {
          flushBeatListen("error");
          trackEvent("beat_error", { day });
        }}
      />
    </div>
  );
}
