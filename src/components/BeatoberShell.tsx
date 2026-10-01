import { BeatoberHome } from "@/components/BeatoberHome";
import { isAdminSession } from "@/lib/admin-auth";
import { loadBeatoberStateSafe } from "@/lib/day-store";

type Props = {
  initialSelectedDay?: number;
};

export async function BeatoberShell({ initialSelectedDay }: Props) {
  const { manifest, patterns } = await loadBeatoberStateSafe();
  const envAuthor = process.env.NEXT_PUBLIC_BEATOBER_AUTHOR === "1";
  const adminSession = await isAdminSession();
  const canPublish = envAuthor || adminSession;

  return (
    <BeatoberHome
      manifest={manifest}
      patterns={patterns}
      nowIso={new Date().toISOString()}
      canPublish={canPublish}
      initialSelectedDay={initialSelectedDay}
    />
  );
}
