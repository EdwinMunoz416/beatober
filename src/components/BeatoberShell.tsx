import { BeatoberHome } from "@/components/BeatoberHome";
import { loadBeatoberStateSafe } from "@/lib/day-store";

type Props = {
  initialSelectedDay?: number;
};

export async function BeatoberShell({ initialSelectedDay }: Props) {
  const { manifest, patterns } = await loadBeatoberStateSafe();
  const authorMode = process.env.NEXT_PUBLIC_BEATOBER_AUTHOR === "1";

  return (
    <BeatoberHome
      manifest={manifest}
      patterns={patterns}
      nowIso={new Date().toISOString()}
      authorMode={authorMode}
      initialSelectedDay={initialSelectedDay}
    />
  );
}
