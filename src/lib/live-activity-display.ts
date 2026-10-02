const LABELS: Record<string, string> = {
  browsing: "Browsing",
  listening_strudel: "Playing Strudel",
  listening_audio: "Playing audio beat",
  locked_day: "Viewing locked day",
};

export function formatLiveActivity(activity: string): string {
  return LABELS[activity] ?? activity.replace(/_/g, " ");
}
