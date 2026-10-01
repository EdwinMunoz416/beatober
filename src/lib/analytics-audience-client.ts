"use client";

import { getVisitorId } from "@/lib/visitor-id";

export type ClientAudience = "visitor" | "internal" | "ignore";

const CACHE_KEY = "beatober_audience";
const LABEL_KEY = "beatober_device_label";

export function getCachedAudience(): ClientAudience {
  if (typeof window === "undefined") return "visitor";
  const v = localStorage.getItem(CACHE_KEY);
  if (v === "internal" || v === "ignore") return v;
  return "visitor";
}

export function getCachedDeviceLabel(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LABEL_KEY);
}

export function setCachedAudience(
  audience: ClientAudience,
  label?: string | null,
): void {
  localStorage.setItem(CACHE_KEY, audience);
  if (label) localStorage.setItem(LABEL_KEY, label);
  else localStorage.removeItem(LABEL_KEY);
}

export async function refreshAudienceFromServer(): Promise<ClientAudience> {
  const visitorId = getVisitorId();
  if (!visitorId) return "visitor";

  try {
    const res = await fetch(
      `/api/analytics/role?visitorId=${encodeURIComponent(visitorId)}`,
    );
    if (!res.ok) return getCachedAudience();
    const data = (await res.json()) as {
      role: ClientAudience;
      label?: string | null;
    };
    setCachedAudience(data.role, data.label);
    return data.role;
  } catch {
    return getCachedAudience();
  }
}

export function shouldSkipTracking(pathname: string): boolean {
  if (pathname.startsWith("/admin")) return true;
  if (process.env.NEXT_PUBLIC_BEATOBER_AUTHOR === "1") return true;
  if (getCachedAudience() === "ignore") return true;
  return false;
}
