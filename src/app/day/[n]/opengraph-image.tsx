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
const TEXT_STROKE = "#ffffff";
const PAGE_BG = "#0c0d10";
const STROKE = 2;

/** Matches former day number block (fontSize 120, lineHeight 1). */
const NUMBER_SLOT_HEIGHT = 120;

const STROKE_XY: [number, number][] = [
  [-STROKE, 0],
  [STROKE, 0],
  [0, -STROKE],
  [0, STROKE],
  [-STROKE, -STROKE],
  [STROKE, -STROKE],
  [-STROKE, STROKE],
  [STROKE, STROKE],
];

type Props = { params: Promise<{ n: string }> };

async function loadLedFont(): Promise<ArrayBuffer> {
  const path = join(process.cwd(), "public", "fonts", "LEDLIGHT.otf");
  const buf = await readFile(path);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

async function loadPreviewBackgroundDataUrl(): Promise<string> {
  const path = join(process.cwd(), "public", "og", "preview-background.png");
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
    loadLedFont(),
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
            }}
          >
            {STROKE_XY.map(([dx, dy]) => (
              <div
                key={`brand-${dx}-${dy}`}
                style={{
                  position: "absolute",
                  fontFamily: LED_FONT,
                  fontSize: 56,
                  letterSpacing: 4,
                  color: TEXT_STROKE,
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
            }}
          >
            {STROKE_XY.map(([dx, dy]) => (
              <div
                key={`theme-${dx}-${dy}`}
                style={{
                  position: "absolute",
                  fontFamily: LED_FONT,
                  fontSize: 42,
                  letterSpacing: 3,
                  color: TEXT_STROKE,
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
