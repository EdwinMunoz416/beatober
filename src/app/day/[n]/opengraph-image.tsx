import { ImageResponse } from "next/og";
import { loadBeatoberStateSafe } from "@/lib/day-store";
import { parseDayParam } from "@/lib/day-routes";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = { params: Promise<{ n: string }> };

export default async function OgImage({ params }: Props) {
  const { n } = await params;
  const day = parseDayParam(n) ?? 1;
  const { manifest } = await loadBeatoberStateSafe();
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
          background: "linear-gradient(160deg, #0c0d10 0%, #1a1030 45%, #0c0d10 100%)",
          color: "#fff",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 28,
            letterSpacing: 8,
            textTransform: "lowercase",
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
            textShadow: "0 0 40px rgba(255,62,200,0.6)",
          }}
        >
          {pad}
        </div>
        <div style={{ fontSize: 32, marginTop: 16, color: "#e8eaef" }}>{title}</div>
        <div style={{ fontSize: 20, marginTop: 12, color: "#8b919e" }}>
          October {manifest.year} · beatober
        </div>
      </div>
    ),
    { ...size },
  );
}
