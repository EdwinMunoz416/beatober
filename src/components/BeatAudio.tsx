"use client";

import { useRef } from "react";
import { trackEvent } from "@/lib/analytics";

type Props = {
  day: number;
  audioUrl: string;
  title?: string;
};

export function BeatAudio({ day, audioUrl, title }: Props) {
  const playedRef = useRef(false);

  return (
    <div className="beat-audio">
      <span className="beat-audio-label">beat</span>
      <audio
        controls
        preload="metadata"
        src={audioUrl}
        aria-label={title ?? `Beat day ${day}`}
        onPlay={() => {
          if (!playedRef.current) {
            playedRef.current = true;
            trackEvent("play_beat", { day });
            trackEvent("beat_play", { day });
          } else {
            trackEvent("beat_play", { day, repeat: true });
          }
        }}
        onEnded={() => trackEvent("beat_ended", { day })}
        onError={() => trackEvent("beat_error", { day })}
      />
    </div>
  );
}
