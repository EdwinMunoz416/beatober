import type { Manifest } from "@/lib/content";
import { defaultSelectedDay, type BeatoberCalendar } from "@/lib/day-access";

export function resolveShellViewDay(
  manifest: Manifest,
  now: Date,
  canPublish: boolean,
  initialSelectedDay?: number,
): number {
  if (
    initialSelectedDay !== undefined &&
    initialSelectedDay >= 1 &&
    initialSelectedDay <= 31
  ) {
    return initialSelectedDay;
  }
  const calendar: BeatoberCalendar = {
    year: manifest.year,
    month: manifest.month,
  };
  return defaultSelectedDay(manifest.days, calendar, now, canPublish);
}
