import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { loadManifest } from "@/lib/content";
import { parseDayParam } from "@/lib/day-routes";

export const runtime = "nodejs";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const LED_FONT = "Ledlight";

type Props = { params: Promise<{ n: string }> };

async function loadLedlightFont(): Promise<ArrayBuffer> {
  const path = join(process.cwd(), "public/fonts/LEDLIGHT.otf");
  const buf = await readFile(path);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

/** OG card — sync manifest only (no Neon); Satori-safe styles. */
export default async function OgImage({ params }: Props) {
  const { n } = await params;
  const day = parseDayParam(n) ?? 1;
  const manifest = loadManifest();
  const entry = manifest.days.find((d) => d.day === day);
  const title = entry?.title ?? `Day ${day}`;
  const pad = String(day).padStart(2, "0");
  const ledFont = await loadLedlightFont();

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
            fontFamily: LED_FONT,
            fontSize: 56,
            color: "#ffffff",
            marginBottom: 24,
            letterSpacing: 4,
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
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: LED_FONT,
          data: ledFont,
          style: "normal",
          weight: 400,
        },
      ],
    },
  );
}
