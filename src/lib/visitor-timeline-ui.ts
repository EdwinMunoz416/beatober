import type { VisitorTimelineEvent } from "@/lib/analytics-visitor-profiles";

export type SessionBlock = {
  sessionKey: string;
  label: string;
  events: VisitorTimelineEvent[];
  listenMs: number;
  engagementMs: number;
};

/** Preserve API order (newest events first); bucket by session id. */
export function groupTimelineBySession(
  events: VisitorTimelineEvent[],
): SessionBlock[] {
  const order: string[] = [];
  const map = new Map<string, VisitorTimelineEvent[]>();

  for (const ev of events) {
    const key = ev.sessionKey ?? "__none__";
    if (!map.has(key)) {
      map.set(key, []);
      order.push(key);
    }
    map.get(key)!.push(ev);
  }

  return order.map((key) => {
    const list = map.get(key)!;
    let listenMs = 0;
    let engagementMs = 0;
    for (const ev of list) {
      if (ev.eventName === "beat_listen" && ev.durationMs) {
        listenMs += ev.durationMs;
      }
      if (ev.eventName === "page_engagement" && ev.durationMs) {
        engagementMs += ev.durationMs;
      }
    }
    return {
      sessionKey: key,
      label: key === "__none__" ? "Unknown session" : `${key.slice(0, 8)}…`,
      events: list,
      listenMs,
      engagementMs,
    };
  });
}
