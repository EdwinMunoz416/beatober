import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { loadManifest } from "@/lib/content";
import { parseDayParam } from "@/lib/day-routes";

export const runtime = "nodejs";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const LED_FONT = "Ledlight";
const MODERN_FONT = "Space Grotesk";
const WHITE = "#ffffff";

type Props = { params: Promise<{ n: string }> };

async function loadFontFile(relativePath: string): Promise<ArrayBuffer> {
  const path = join(process.cwd(), relativePath);
  const buf = await readFile(path);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

/** OG card — sync manifest only (no Neon); Satori-safe styles. */
export default async function OgImage({ params }: Props) {
  const { n } = await params;
  const day = parseDayParam(n) ?? 1;
  const manifest = loadManifest();
  const entry = manifest.days.find((d) => d.day === day);
  const title = entry?.title;
  const pad = String(day).padStart(2, "0");
  const [ledFont, modernMedium, modernBold] = await Promise.all([
    loadFontFile("public/fonts/LEDLIGHT.otf"),
    loadFontFile("public/fonts/SpaceGrotesk-500.woff"),
    loadFontFile("public/fonts/SpaceGrotesk-700.woff"),
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
          color: WHITE,
          fontFamily: MODERN_FONT,
        }}
      >
        <div
          style={{
            fontFamily: LED_FONT,
            fontSize: 56,
            color: WHITE,
            marginBottom: 24,
            letterSpacing: 4,
          }}
        >
          studio-daze
        </div>
        <div
          style={{
            fontFamily: MODERN_FONT,
            fontSize: 120,
            fontWeight: 700,
            color: WHITE,
            letterSpacing: -3,
            lineHeight: 1,
          }}
        >
          {pad}
        </div>
        {title ? (
          <div
            style={{
              fontFamily: MODERN_FONT,
              fontSize: 34,
              fontWeight: 500,
              marginTop: 16,
              color: WHITE,
              letterSpacing: -0.5,
            }}
          >
            {title}
          </div>
        ) : (
          <div
            style={{
              fontFamily: MODERN_FONT,
              fontSize: 34,
              fontWeight: 500,
              marginTop: 16,
              color: WHITE,
            }}
          >
            {`Day ${pad}`}
          </div>
        )}
        <div
          style={{
            fontFamily: MODERN_FONT,
            fontSize: 20,
            fontWeight: 500,
            marginTop: 12,
            color: WHITE,
          }}
        >
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
        {
          name: MODERN_FONT,
          data: modernMedium,
          style: "normal",
          weight: 500,
        },
        {
          name: MODERN_FONT,
          data: modernBold,
          style: "normal",
          weight: 700,
        },
      ],
    },
  );
}
