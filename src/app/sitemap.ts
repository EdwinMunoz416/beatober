import type { MetadataRoute } from "next";
import { dayPath, siteBaseUrl } from "@/lib/day-routes";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteBaseUrl();
  const now = new Date();
  const days: MetadataRoute.Sitemap = [];
  for (let day = 1; day <= 31; day += 1) {
    days.push({
      url: `${base}${dayPath(day)}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    });
  }
  return [{ url: base, lastModified: now, changeFrequency: "daily", priority: 1 }, ...days];
}
