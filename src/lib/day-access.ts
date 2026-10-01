export type BeatoberCalendar = {
  year: number;
  month: number;
};

/** Start of local calendar day for Oct (or configured) day N. */
export function unlockInstant(
  calendar: BeatoberCalendar,
  day: number,
): Date {
  return new Date(calendar.year, calendar.month - 1, day, 0, 0, 0, 0);
}

export function startOfToday(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

/**
 * Public visitors: day is playable when approved AND the calendar date has arrived.
 * Author mode bypasses locks for drafting and approval.
 */
export function isDayLocked(
  day: number,
  approved: boolean,
  calendar: BeatoberCalendar,
  now: Date,
  authorMode: boolean,
): boolean {
  if (authorMode) return false;
  if (!approved) return true;
  const today = startOfToday(now);
  return today < unlockInstant(calendar, day);
}

export function defaultSelectedDay(
  days: { day: number; approved: boolean }[],
  calendar: BeatoberCalendar,
  now: Date,
  authorMode: boolean,
): number {
  if (authorMode) {
    const today = now.getDate();
    if (calendar.month === now.getMonth() + 1 && calendar.year === now.getFullYear()) {
      const hit = days.find((d) => d.day === today);
      if (hit) return today;
    }
    return 1;
  }

  const unlocked = days
    .filter((d) => !isDayLocked(d.day, d.approved, calendar, now, false))
    .map((d) => d.day)
    .sort((a, b) => b - a);

  return unlocked[0] ?? 1;
}
