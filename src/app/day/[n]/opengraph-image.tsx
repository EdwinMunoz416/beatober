import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { loadManifest } from "@/lib/content";
import { parseDayParam } from "@/lib/day-routes";

export const runtime = "nodejs";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const LED_FONT = "Ledlight";
const WHITE = "#ffffff";
const PAGE_BG = "#0c0d10";
const PREVIEW_BG = "public/og/preview-background.png";

/** Matches former day number block (fontSize 120, lineHeight 1). */
const NUMBER_SLOT_HEIGHT = 120;

type Props = { params: Promise<{ n: string }> };

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
          color: WHITE,
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
              height: NUMBER_SLOT_HEIGHT,
              flexShrink: 0,
            }}
          />
          <div
            style={{
              fontFamily: LED_FONT,
              fontSize: 42,
              marginTop: 20,
              color: WHITE,
              letterSpacing: 3,
              textAlign: "center",
              maxWidth: 1000,
            }}
          >
            {theme}
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
