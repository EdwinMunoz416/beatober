/** Full Beattober arc (October days 1–31). */
export const BEATOBER_BEAT_TOTAL = 31;

export function formatBeatProgress(count: number, total = BEATOBER_BEAT_TOTAL): string {
  const n = Math.max(0, Math.min(count, total));
  return `${n}/${total}`;
}
