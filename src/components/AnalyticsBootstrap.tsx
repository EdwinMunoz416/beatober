"use client";

import { useEffect } from "react";
import { refreshAudienceFromServer } from "@/lib/analytics-audience-client";

/** Sync device role from Neon once per load (for ignore/internal). */
export function AnalyticsBootstrap() {
  useEffect(() => {
    void refreshAudienceFromServer();
  }, []);
  return null;
}
