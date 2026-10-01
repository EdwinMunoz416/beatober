import { track as vercelTrack } from "@vercel/analytics";

type Props = Record<string, string | number | boolean | null | undefined>;

/** Custom events (requires Web Analytics enabled on the Vercel project). */
export function trackEvent(name: string, properties?: Props): void {
  if (typeof window === "undefined") return;
  if (process.env.NODE_ENV === "development") {
    console.debug("[analytics]", name, properties);
  }
  const clean: Record<string, string | number | boolean | null> = {};
  if (properties) {
    for (const [k, v] of Object.entries(properties)) {
      if (v !== undefined) clean[k] = v;
    }
  }
  vercelTrack(name, clean);
}
