import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BeatoberShell } from "@/components/BeatoberShell";
import { loadBeatoberStateSafe } from "@/lib/day-store";
import { dayPath, parseDayParam, siteBaseUrl } from "@/lib/day-routes";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ n: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { n } = await params;
  const day = parseDayParam(n);
  if (day === null) return { title: "beatober" };

  const { manifest } = await loadBeatoberStateSafe();
  const entry = manifest.days.find((d) => d.day === day);
  const title = entry?.title ?? `Day ${day}`;
  const base = siteBaseUrl();
  const url = `${base}${dayPath(day)}`;

  return {
    title: `${title} · studio-daze beatober`,
    description: `Strudel pattern and beat — October day ${day}.`,
    openGraph: {
      title: `${title} · beatober`,
      description: `October ${day}, ${manifest.year} — studio-daze beatober`,
      url,
      siteName: "studio-daze beatober",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} · beatober`,
    },
  };
}

export default async function DayPage({ params }: Props) {
  const { n } = await params;
  const day = parseDayParam(n);
  if (day === null) notFound();

  return <BeatoberShell initialSelectedDay={day} />;
}
