export type ReferrerBucket = "direct" | "search" | "social" | "other";

export type ReferrerContext = {
  bucket: ReferrerBucket;
  /** Stable id for metrics, e.g. discord, x, direct, example.com */
  source: string;
  host: string | null;
  utmSource: string | null;
  utmMedium: string | null;
};

type Rule = {
  source: string;
  bucket: ReferrerBucket;
  match: (host: string) => boolean;
};

const RULES: Rule[] = [
  {
    source: "discord",
    bucket: "social",
    match: (h) =>
      h === "discord.com" ||
      h.endsWith(".discord.com") ||
      h === "discord.gg" ||
      h.endsWith(".discord.gg") ||
      h === "discordapp.com" ||
      h.endsWith(".discordapp.com"),
  },
  {
    source: "x",
    bucket: "social",
    match: (h) =>
      h === "x.com" ||
      h === "twitter.com" ||
      h.endsWith(".twitter.com") ||
      h === "t.co",
  },
  {
    source: "instagram",
    bucket: "social",
    match: (h) =>
      h === "instagram.com" ||
      h.endsWith(".instagram.com") ||
      h === "l.instagram.com",
  },
  {
    source: "facebook",
    bucket: "social",
    match: (h) =>
      h === "facebook.com" ||
      h.endsWith(".facebook.com") ||
      h === "fb.com" ||
      h === "m.facebook.com",
  },
  {
    source: "tiktok",
    bucket: "social",
    match: (h) => h === "tiktok.com" || h.endsWith(".tiktok.com"),
  },
  {
    source: "reddit",
    bucket: "social",
    match: (h) => h === "reddit.com" || h.endsWith(".reddit.com"),
  },
  {
    source: "youtube",
    bucket: "social",
    match: (h) =>
      h === "youtube.com" ||
      h.endsWith(".youtube.com") ||
      h === "youtu.be" ||
      h === "m.youtube.com",
  },
  {
    source: "threads",
    bucket: "social",
    match: (h) => h === "threads.net" || h.endsWith(".threads.net"),
  },
  {
    source: "linkedin",
    bucket: "social",
    match: (h) => h === "linkedin.com" || h.endsWith(".linkedin.com"),
  },
  {
    source: "twitch",
    bucket: "social",
    match: (h) => h === "twitch.tv" || h.endsWith(".twitch.tv"),
  },
  {
    source: "whatsapp",
    bucket: "social",
    match: (h) =>
      h === "whatsapp.com" ||
      h.endsWith(".whatsapp.com") ||
      h === "wa.me" ||
      h === "web.whatsapp.com",
  },
  {
    source: "telegram",
    bucket: "social",
    match: (h) =>
      h === "t.me" ||
      h === "telegram.org" ||
      h.endsWith(".telegram.org"),
  },
  {
    source: "bluesky",
    bucket: "social",
    match: (h) => h === "bsky.app" || h.endsWith(".bsky.app"),
  },
  {
    source: "spotify",
    bucket: "social",
    match: (h) => h === "open.spotify.com" || h.endsWith(".spotify.com"),
  },
  {
    source: "google",
    bucket: "search",
    match: (h) => h === "google.com" || h.endsWith(".google.com"),
  },
  {
    source: "bing",
    bucket: "search",
    match: (h) => h === "bing.com" || h.endsWith(".bing.com"),
  },
  {
    source: "duckduckgo",
    bucket: "search",
    match: (h) => h === "duckduckgo.com" || h.endsWith(".duckduckgo.com"),
  },
  {
    source: "github",
    bucket: "other",
    match: (h) => h === "github.com" || h.endsWith(".github.com"),
  },
  {
    source: "vercel",
    bucket: "other",
    match: (h) => h.endsWith(".vercel.app") || h === "vercel.com",
  },
];

function normalizeHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, "");
}

function hostToSource(host: string): string {
  if (host.length <= 48) return host;
  return host.slice(0, 48);
}

function readUtm(): { utmSource: string | null; utmMedium: string | null } {
  if (typeof window === "undefined") {
    return { utmSource: null, utmMedium: null };
  }
  const params = new URLSearchParams(window.location.search);
  const utmSource = params.get("utm_source")?.trim().slice(0, 64) || null;
  const utmMedium = params.get("utm_medium")?.trim().slice(0, 64) || null;
  return { utmSource, utmMedium };
}

/** Classify document.referrer + optional utm_* on the landing URL. */
export function classifyReferrer(referrerUrl: string | undefined): ReferrerContext {
  const { utmSource, utmMedium } = readUtm();

  if (utmSource) {
    const slug = utmSource
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .slice(0, 48);
    return {
      bucket: "social",
      source: slug.startsWith("utm-") ? slug : `utm-${slug}`,
      host: null,
      utmSource,
      utmMedium,
    };
  }

  if (!referrerUrl?.trim()) {
    return {
      bucket: "direct",
      source: "direct",
      host: null,
      utmSource: null,
      utmMedium: null,
    };
  }

  try {
    const host = normalizeHost(new URL(referrerUrl).hostname);
    for (const rule of RULES) {
      if (rule.match(host)) {
        return {
          bucket: rule.bucket,
          source: rule.source,
          host,
          utmSource: null,
          utmMedium,
        };
      }
    }
    return {
      bucket: "other",
      source: hostToSource(host),
      host,
      utmSource: null,
      utmMedium,
    };
  } catch {
    return {
      bucket: "other",
      source: "unknown",
      host: null,
      utmSource: null,
      utmMedium: null,
    };
  }
}

export function getReferrerContext(): ReferrerContext {
  if (typeof document === "undefined") {
    return classifyReferrer(undefined);
  }
  return classifyReferrer(document.referrer);
}

/** @deprecated use getReferrerContext().bucket */
export function referrerBucketFromContext(ctx: ReferrerContext): string {
  return ctx.bucket;
}
