import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { loadManifest } from "@/lib/content";
import { parseDayParam } from "@/lib/day-routes";

export const runtime = "nodejs";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const LED_FONT = "Ledlight";
const TEXT_FILL = "#000000";
const PAGE_BG = "#0c0d10";
const PREVIEW_BG = "public/og/preview-background.png";

const PILL_BG = "rgba(0, 0, 0, 0.5)";
const PILL_BORDER = "rgba(255, 255, 255, 0.18)";

/** Matches former day number block (fontSize 120, lineHeight 1). */
const NUMBER_SLOT_HEIGHT = 120;

/** Simulates multi-layer text-shadow / halo (Satori has no text-shadow). */
const GLOW_RINGS: { radius: number; alpha: number }[] = [
  { radius: 1, alpha: 0.95 },
  { radius: 2, alpha: 0.9 },
  { radius: 3, alpha: 0.78 },
  { radius: 4, alpha: 0.65 },
  { radius: 6, alpha: 0.48 },
  { radius: 8, alpha: 0.38 },
];

type Props = { params: Promise<{ n: string }> };

type GlowLayer = { dx: number; dy: number; alpha: number; key: string };

function buildGlowLayers(prefix: string): GlowLayer[] {
  const out: GlowLayer[] = [];
  for (const { radius, alpha } of GLOW_RINGS) {
    const d = Math.round(radius * 0.707);
    const points: [number, number][] = [
      [radius, 0],
      [-radius, 0],
      [0, radius],
      [0, -radius],
      [d, d],
      [-d, d],
      [d, -d],
      [-d, -d],
    ];
    for (const [dx, dy] of points) {
      out.push({
        dx,
        dy,
        alpha,
        key: `${prefix}-${radius}-${dx}-${dy}`,
      });
    }
  }
  return out;
}

const GLOW_LAYERS = buildGlowLayers("g");

async function loadFontFile(relativePath: string): Promise<ArrayBuffer> {
  const path = join(process.cwd(), relativePath);
  const buf = await readFile(path);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

async function loadPreviewBackgroundDataUrl(): Promise<string> {
  const path = join(process.cwd(), PREVIEW_BG);
  const buf = await readFile(path);
  return `data:image/png;base64,${buf.toString("base64")}`;
}

/** OG card — sync manifest only (no Neon); Satori-safe styles. */
export default async function OgImage({ params }: Props) {
  const { n } = await params;
  const day = parseDayParam(n) ?? 1;
  const manifest = loadManifest();
  const entry = manifest.days.find((d) => d.day === day);
  const theme = entry?.title ?? `day ${day}`;
  const [ledFont, bgSrc] = await Promise.all([
    loadFontFile("public/fonts/LEDLIGHT.otf"),
    loadPreviewBackgroundDataUrl(),
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
          position: "relative",
          backgroundColor: PAGE_BG,
        }}
      >
        <img
          src={bgSrc}
          alt=""
          width={1200}
          height={630}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
        />
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              position: "relative",
              display: "flex",
              justifyContent: "center",
              marginBottom: 24,
              backgroundColor: PILL_BG,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: PILL_BORDER,
              borderStyle: "solid",
              paddingTop: 8,
              paddingBottom: 8,
              paddingLeft: 16,
              paddingRight: 16,
            }}
          >
            {GLOW_LAYERS.map(({ dx, dy, alpha, key }) => (
              <div
                key={`brand-${key}`}
                style={{
                  position: "absolute",
                  fontFamily: LED_FONT,
                  fontSize: 56,
                  letterSpacing: 4,
                  color: `rgba(255, 255, 255, ${alpha})`,
                  left: dx,
                  top: dy,
                }}
              >
                studio daze
              </div>
            ))}
            <div
              style={{
                position: "relative",
                fontFamily: LED_FONT,
                fontSize: 56,
                letterSpacing: 4,
                color: TEXT_FILL,
              }}
            >
              studio daze
            </div>
          </div>
          <div
            style={{
              height: NUMBER_SLOT_HEIGHT,
              flexShrink: 0,
            }}
          />
          <div
            style={{
              position: "relative",
              display: "flex",
              justifyContent: "center",
              marginTop: 20,
              maxWidth: 1000,
              backgroundColor: PILL_BG,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: PILL_BORDER,
              borderStyle: "solid",
              paddingTop: 8,
              paddingBottom: 8,
              paddingLeft: 16,
              paddingRight: 16,
            }}
          >
            {GLOW_LAYERS.map(({ dx, dy, alpha, key }) => (
              <div
                key={`theme-${key}`}
                style={{
                  position: "absolute",
                  fontFamily: LED_FONT,
                  fontSize: 42,
                  letterSpacing: 3,
                  color: `rgba(255, 255, 255, ${alpha})`,
                  left: dx,
                  top: dy,
                }}
              >
                {theme}
              </div>
            ))}
            <div
              style={{
                position: "relative",
                fontFamily: LED_FONT,
                fontSize: 42,
                letterSpacing: 3,
                color: TEXT_FILL,
                textAlign: "center",
              }}
            >
              {theme}
            </div>
          </div>
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
