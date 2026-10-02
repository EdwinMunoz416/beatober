import type { CSSProperties } from "react";
import { formatReferrerSource } from "@/lib/referrer-display";
import { formatGeoChip } from "@/lib/geo-display";
import { hash32, visitorDisplayLabel, visitorDisplayShow } from "@/lib/visitor-nickname";

export function avatarStyleForVisitor(visitorId: string): CSSProperties {
  return { "--visitor-avatar-hue": String(hash32(visitorId)) } as CSSProperties;
}

export function profileDisplayName(
  deviceLabel: string | null | undefined,
  lockedNickname: string | null | undefined,
): string {
  return visitorDisplayLabel(deviceLabel, lockedNickname);
}

export function profileSeriesLabel(
  deviceLabel: string | null | undefined,
  lockedShowTitle: string | null | undefined,
): string | null {
  return visitorDisplayShow(deviceLabel, lockedShowTitle);
}

export function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatActiveDays(activeDays: number): string {
  if (activeDays <= 1) return "1 day";
  return `${activeDays} days`;
}

type StoryInput = {
  lastPath: string | null;
  topDay: number | null;
  lastReferrerSource: string;
  geoCountry: string | null;
  geoRegion: string | null;
  playedBeat: boolean;
  isReturning: boolean;
};

export function visitorStoryLine(input: StoryInput): string {
  const parts: string[] = [];

  if (input.isReturning) {
    parts.push("Came back this week");
  } else {
    parts.push("First time this week");
  }

  if (input.topDay != null) {
    parts.push(`focused on day ${String(input.topDay).padStart(2, "0")}`);
  } else if (input.lastPath) {
    const short =
      input.lastPath === "/"
        ? "home"
        : input.lastPath.replace(/^\/day\//, "day ").replace(/^\//, "");
    parts.push(`last on ${short}`);
  }

  const src = formatReferrerSource(input.lastReferrerSource);
  if (src && src !== "Direct") {
    parts.push(`via ${src}`);
  }

  const geo = formatGeoChip(input.geoCountry, input.geoRegion);
  if (geo !== "Geo unknown") {
    parts.push(geo);
  }

  if (input.playedBeat) {
    parts.push("played a beat");
  }

  return parts.join(" · ");
}

export function formatDurationMs(ms: number): string {
  if (!ms || ms < 1000) return "<1s";
  /** Floor so the label never ticks backward when ms only grows. */
  const totalSec = Math.floor(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const mins = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (mins < 60) return sec > 0 ? `${mins}m ${sec}s` : `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs}h`;
}
