"use client";

import { BlurText } from "@/components/ReactBits/BlurText";

type Props = {
  day: number;
  title?: string;
};

/** Public locked days — standalone content shell (no Strudel). */
export function LockedDayPanel({ day, title }: Props) {
  const pad = String(day).padStart(2, "0");
  const label = title?.trim()
    ? `${title} — coming soon`
    : `Day ${pad} — coming soon`;

  return (
    <article className="locked-day-panel" aria-label={label}>
      <div className="locked-day-panel__stage">
        <p className="locked-day-panel__display" aria-live="polite">
          <BlurText
            text="coming soon"
            animateBy="words"
            direction="top"
            delay={120}
            stepDuration={0.5}
            className="locked-day-panel__blur"
          />
        </p>
      </div>
    </article>
  );
}
