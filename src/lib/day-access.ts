export type BeatoberCalendar = {
  year: number;
  month: number;
};

/** Calendar “today” for unlocks and default day (Vercel runs UTC; Beattober days follow this TZ). */
export const BEATOBER_TIMEZONE =
  process.env.NEXT_PUBLIC_BEATOBER_TIMEZONE ??
  process.env.BEATOBER_TIMEZONE ??
  "America/Chicago";

export type CalendarParts = {
  year: number;
  month: number;
  day: number;
};

export function calendarPartsInTimeZone(
  now: Date,
  timeZone: string = BEATOBER_TIMEZONE,
): CalendarParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
  const parts = fmt.formatToParts(now);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number.parseInt(
      parts.find((p) => p.type === type)?.value ?? "0",
      10,
    );
  return { year: read("year"), month: read("month"), day: read("day") };
}

function manifestDayOrdinal(calendar: BeatoberCalendar, day: number): number {
  return calendar.year * 10_000 + calendar.month * 100 + day;
}

function nowOrdinal(
  now: Date,
  timeZone: string = BEATOBER_TIMEZONE,
): number {
  const p = calendarPartsInTimeZone(now, timeZone);
  return p.year * 10_000 + p.month * 100 + p.day;
}

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
  return nowOrdinal(now) < manifestDayOrdinal(calendar, day);
}

/** Home / shell: prefer today’s October day when playable; else latest unlocked, else 1. */
export function defaultSelectedDay(
  days: { day: number; approved: boolean }[],
  calendar: BeatoberCalendar,
  now: Date,
  authorMode: boolean,
): number {
  const parts = calendarPartsInTimeZone(now);
  const inManifestMonth =
    parts.year === calendar.year && parts.month === calendar.month;

  if (inManifestMonth) {
    const hit = days.find((d) => d.day === parts.day);
    if (hit) {
      if (authorMode) return parts.day;
      if (!isDayLocked(hit.day, hit.approved, calendar, now, false)) {
        return parts.day;
      }
    }
  }

  if (authorMode) return 1;

  const unlocked = days
    .filter((d) => !isDayLocked(d.day, d.approved, calendar, now, false))
    .map((d) => d.day)
    .sort((a, b) => b - a);

  return unlocked[0] ?? 1;
}
