/** Full-viewport workspace GIF while Strudel is playing (day → public URL). */
export const DAY_PLAYBACK_WORKSPACE_BG: Partial<Record<number, string>> = {
  1: "/backgrounds/night-drive.gif",
  2: "/backgrounds/traininspo3.gif",
};

export function workspaceBgForDay(day: number): string | undefined {
  return DAY_PLAYBACK_WORKSPACE_BG[day];
}
