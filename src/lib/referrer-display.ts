const LABELS: Record<string, string> = {
  direct: "Direct",
  discord: "Discord",
  x: "X",
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  reddit: "Reddit",
  youtube: "YouTube",
  threads: "Threads",
  linkedin: "LinkedIn",
  twitch: "Twitch",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  bluesky: "Bluesky",
  spotify: "Spotify",
  google: "Google",
  bing: "Bing",
  duckduckgo: "DuckDuckGo",
  github: "GitHub",
  vercel: "Vercel",
  unknown: "Unknown",
  other: "Other",
};

export function formatReferrerSource(source: string): string {
  const key = source.trim().toLowerCase();
  if (LABELS[key]) return LABELS[key]!;
  if (key.startsWith("utm-")) {
    const raw = key.slice(4).replace(/-/g, " ");
    return raw ? `UTM: ${raw}` : "UTM";
  }
  return source;
}

export function formatReferrerTrail(
  first: string,
  last: string,
): string {
  const a = formatReferrerSource(first);
  const b = formatReferrerSource(last);
  return a === b ? a : `${a} → ${b}`;
}
