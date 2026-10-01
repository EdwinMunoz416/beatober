"use client";

import { BlurText } from "@/components/ReactBits/BlurText";
import { ShinyText } from "@/components/ReactBits/ShinyText";

type Props = {
  day: number;
  title?: string;
  month?: number;
};

/** Public locked days — standalone content shell (no Strudel). */
export function LockedDayPanel({ day, title, month = 10 }: Props) {
  const pad = String(day).padStart(2, "0");
  const theme = title?.trim() || `day ${pad}`;

  return (
    <article
      className="locked-day-panel"
      aria-labelledby={`locked-day-${day}-title`}
    >
      <header className="locked-day-panel__header">
        <p className="locked-day-panel__eyebrow">
          {month === 10 ? "october" : `month ${month}`} · day {pad}
        </p>
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

      <footer className="locked-day-panel__footer">
        <p className="locked-day-panel__note">
          <ShinyText
            text="unlocks when the calendar catches up"
            color="#6b7280"
            shineColor="#ff3ec8"
            speed={6}
          />
        </p>
      </footer>
    </article>
  );
}
