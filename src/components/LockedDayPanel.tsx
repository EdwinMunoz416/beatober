"use client";

import { BlurText } from "@/components/ReactBits/BlurText";

type Props = {
  day: number;
  title?: string;
};

/** Public locked days — standalone content shell (no Strudel). */
export function LockedDayPanel({ day, title }: Props) {
  const pad = String(day).padStart(2, "0");
  const theme = title?.trim() || `day ${pad}`;

  return (
    <article
      className="locked-day-panel"
      aria-labelledby={`locked-day-${day}-title`}
    >
      <header className="locked-day-panel__header">
        <h2 id={`locked-day-${day}-title`} className="locked-day-panel__title">
          {theme}
        </h2>
      </header>

      <div className="locked-day-panel__stage">
        <p className="locked-day-panel__display" aria-live="polite">
          <BlurText
            text="coming soon"
            animateBy="letters"
            direction="top"
            delay={90}
            stepDuration={0.5}
            className="locked-day-panel__blur"
          />
        </p>
      </div>
    </article>
  );
}
