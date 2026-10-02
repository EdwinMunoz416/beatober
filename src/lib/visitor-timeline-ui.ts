import type { VisitorTimelineEvent } from "@/lib/analytics-visitor-profiles";

export type SessionBlock = {
  sessionKey: string;
  label: string;
  events: VisitorTimelineEvent[];
  listenMs: number;
  engagementMs: number;
};

function sessionStartLabel(events: VisitorTimelineEvent[]): string {
  const times = events.map((ev) => new Date(ev.at).getTime());
  const start = new Date(Math.min(...times));
  return start.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function visitBlockLabel(
  events: VisitorTimelineEvent[],
  index: number,
  total: number,
): string {
  const when = sessionStartLabel(events);
  if (index === 0) return `Latest visit · ${when}`;
  if (index === total - 1 && total > 1) return `First visit · ${when}`;
  return `Earlier visit · ${when}`;
}

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

  const total = order.length;

  return order.map((key, index) => {
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
    const label =
      key === "__none__"
        ? `Activity · ${sessionStartLabel(list)}`
        : visitBlockLabel(list, index, total);
    return {
      sessionKey: key,
      label,
      events: list,
      listenMs,
      engagementMs,
    };
  });
}
