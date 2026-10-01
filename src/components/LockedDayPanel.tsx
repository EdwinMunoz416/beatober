type Props = {
  day: number;
  title?: string;
};

/** Public locked days — no Strudel; room for future audio/video in the shell above this block. */
export function LockedDayPanel({ day, title }: Props) {
  const pad = String(day).padStart(2, "0");
  return (
    <section
      className="locked-day-panel"
      aria-label={`Day ${day} coming soon`}
    >
      <p className="locked-day-panel__label">
        day {pad}
        {title ? ` · ${title}` : ""}
      </p>
      <p className="locked-day-panel__headline">Coming soon</p>
    </section>
  );
}
