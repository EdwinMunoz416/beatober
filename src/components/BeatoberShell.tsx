import { BeatoberHome } from "@/components/BeatoberHome";
import { isAdminSession } from "@/lib/admin-auth";
import { loadBeatoberShellState } from "@/lib/day-store";

type Props = {
  initialSelectedDay?: number;
};

export async function BeatoberShell({ initialSelectedDay }: Props) {
  const now = new Date();
  const envAuthor = process.env.NEXT_PUBLIC_BEATOBER_AUTHOR === "1";
  const adminSession = await isAdminSession();
  const canPublish = envAuthor || adminSession;

  const { manifest, patterns, viewDay } = await loadBeatoberShellState(
    now,
    canPublish,
    initialSelectedDay,
  );

  return (
    <BeatoberHome
      manifest={manifest}
      patterns={patterns}
      nowIso={now.toISOString()}
      canPublish={canPublish}
      initialSelectedDay={viewDay}
    />
  );
}
