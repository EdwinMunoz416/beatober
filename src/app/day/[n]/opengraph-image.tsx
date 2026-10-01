import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { loadManifest } from "@/lib/content";
import { parseDayParam } from "@/lib/day-routes";

export const runtime = "nodejs";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const LED_FONT = "Ledlight";
const NUM_FONT = "Space Grotesk";

const NUM_FONT_URL =
  "https://cdn.jsdelivr.net/fontsource/fonts/space-grotesk@5.2.5/latin-700-normal.woff";

type Props = { params: Promise<{ n: string }> };

async function loadLedlightFont(): Promise<ArrayBuffer> {
  const path = join(process.cwd(), "public/fonts/LEDLIGHT.otf");
  const buf = await readFile(path);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

let numericFontCache: Promise<ArrayBuffer> | null = null;

async function loadNumericFont(): Promise<ArrayBuffer> {
  if (!numericFontCache) {
    numericFontCache = fetch(NUM_FONT_URL).then((res) => {
      if (!res.ok) {
        throw new Error(`Failed to load ${NUM_FONT}: ${res.status}`);
      }
      return res.arrayBuffer();
    });
  }
  return numericFontCache;
}

/** OG card — sync manifest only (no Neon); Satori-safe styles. */
export default async function OgImage({ params }: Props) {
  const { n } = await params;
  const day = parseDayParam(n) ?? 1;
  const manifest = loadManifest();
  const entry = manifest.days.find((d) => d.day === day);
  const title = entry?.title;
  const pad = String(day).padStart(2, "0");
  const [ledFont, numFont] = await Promise.all([
    loadLedlightFont(),
    loadNumericFont(),
  ]);

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
          fontFamily: NUM_FONT,
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
            fontFamily: NUM_FONT,
            fontSize: 120,
            fontWeight: 700,
            color: "#ff3ec8",
            letterSpacing: -2,
            lineHeight: 1,
          }}
        >
          {pad}
        </div>
        {title ? (
          <div
            style={{
              fontFamily: LED_FONT,
              fontSize: 32,
              marginTop: 16,
              color: "#e8eaef",
              letterSpacing: 2,
            }}
          >
            {title}
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              fontSize: 32,
              marginTop: 16,
              color: "#e8eaef",
            }}
          >
            <span style={{ fontFamily: LED_FONT, letterSpacing: 2 }}>Day </span>
            <span style={{ fontFamily: NUM_FONT, fontWeight: 700 }}>{pad}</span>
          </div>
        )}
        <div
          style={{
            display: "flex",
            fontSize: 20,
            marginTop: 12,
            color: "#8b919e",
            alignItems: "center",
          }}
        >
          <span style={{ fontFamily: LED_FONT, letterSpacing: 1 }}>October </span>
          <span style={{ fontFamily: NUM_FONT, fontWeight: 700 }}>{day}</span>
          <span style={{ fontFamily: LED_FONT }}>, </span>
          <span style={{ fontFamily: NUM_FONT, fontWeight: 700 }}>
            {manifest.year}
          </span>
          <span style={{ fontFamily: LED_FONT, letterSpacing: 1 }}> · beatober</span>
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
        {
          name: NUM_FONT,
          data: numFont,
          style: "normal",
          weight: 700,
        },
      ],
    },
  );
}
