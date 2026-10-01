import { ImageResponse } from "next/og";
import { loadManifest } from "@/lib/content";
import { parseDayParam } from "@/lib/day-routes";

export const runtime = "nodejs";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = { params: Promise<{ n: string }> };

/** OG card — sync manifest only (no Neon); Satori-safe styles. */
export default async function OgImage({ params }: Props) {
  const { n } = await params;
  const day = parseDayParam(n) ?? 1;
  const manifest = loadManifest();
  const entry = manifest.days.find((d) => d.day === day);
  const title = entry?.title ?? `Day ${day}`;
  const pad = String(day).padStart(2, "0");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#0c0d10",
          color: "#ffffff",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 28,
            color: "#5ef0ff",
            marginBottom: 24,
          }}
        >
          studio-daze
        </div>
        <div
          style={{
            fontSize: 96,
            fontWeight: 700,
            color: "#ff3ec8",
          }}
        >
          {pad}
        </div>
        <div style={{ fontSize: 32, marginTop: 16, color: "#e8eaef" }}>{title}</div>
        <div style={{ fontSize: 20, marginTop: 12, color: "#8b919e" }}>
          {`October ${day}, ${manifest.year} · beatober`}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
