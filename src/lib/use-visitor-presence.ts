"use client";

import { useEffect } from "react";
import { trackVisitorPresence } from "@/lib/analytics-presence";

const HEARTBEAT_MS = 25_000;

/** Keep live admin fresh while the tab is open (localhost + production). */
export function useVisitorPresence(pathname: string, viewDay: number): void {
  useEffect(() => {
    if (pathname.startsWith("/admin")) return;

    const ping = () => {
      trackVisitorPresence({
        path: pathname,
        day: viewDay >= 1 && viewDay <= 31 ? viewDay : null,
      });
    };

    ping();
    const interval = window.setInterval(ping, HEARTBEAT_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") ping();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [pathname, viewDay]);
}
