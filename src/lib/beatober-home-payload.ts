import { isAdminSession } from "@/lib/admin-auth";
import { loadBeatoberStateSafe } from "@/lib/day-store";
import { resolveShellViewDay } from "@/lib/resolve-shell-day";

export type BeatoberHomePayload = {
  manifest: Awaited<ReturnType<typeof loadBeatoberStateSafe>>["manifest"];
  patterns: Record<number, string>;
  nowIso: string;
  canPublish: boolean;
  initialSelectedDay: number;
};

/** Server: merged calendar + all day patterns (Neon or git) for client preload. */
export async function loadBeatoberHomePayload(
  routeDay?: number,
): Promise<BeatoberHomePayload> {
  const now = new Date();
  const envAuthor = process.env.NEXT_PUBLIC_BEATOBER_AUTHOR === "1";
  const adminSession = await isAdminSession();
  const canPublish = envAuthor || adminSession;
  const { manifest, patterns } = await loadBeatoberStateSafe();
  const initialSelectedDay = resolveShellViewDay(
    manifest,
    now,
    canPublish,
    routeDay,
  );
  return {
    manifest,
    patterns,
    nowIso: now.toISOString(),
    canPublish,
    initialSelectedDay,
  };
}
