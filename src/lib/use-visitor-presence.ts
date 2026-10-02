"use client";

import { useEffect } from "react";
import {
  getVisitorActivity,
  trackVisitorPresence,
} from "@/lib/analytics-presence";

const HEARTBEAT_BROWSING_MS = 25_000;
const HEARTBEAT_LISTENING_MS = 10_000;

/** Keep live admin fresh while the tab is open (localhost + production). */
export function useVisitorPresence(pathname: string, viewDay: number): void {
  useEffect(() => {
    if (pathname.startsWith("/admin")) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const ping = () => {
      trackVisitorPresence({
        path: pathname,
        day: viewDay >= 1 && viewDay <= 31 ? viewDay : null,
      });
    };

    const schedule = () => {
      if (cancelled) return;
      ping();
      const listening = getVisitorActivity().startsWith("listening");
      const delay = listening ? HEARTBEAT_LISTENING_MS : HEARTBEAT_BROWSING_MS;
      timer = setTimeout(schedule, delay);
    };

    schedule();

    const onVisibility = () => {
      if (document.visibilityState === "visible") ping();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      if (timer != null) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [pathname, viewDay]);
}
