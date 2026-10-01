"use client";

/** Matches StrudelMirror default when pattern uses `.onPaint` / `all(pianoroll)`. */
export const STRUDEL_DRAW_TIME: [number, number] = [-2, 2];

export const STRUDEL_PATTERN_CANVAS_ID = "test-canvas";
export const STRUDEL_REPL_ID = "studiodaze-beatober";

let visualsReady: Promise<void> | null = null;

function cssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return v || fallback;
}

/** Canvas layer + CM widget types + draw theme (client-only). */
export function ensureStrudelVisuals(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }
  if (!visualsReady) {
    visualsReady = (async () => {
      const draw = await import("@strudel/draw");
      const cm = await import("@strudel/codemirror");

      cm.initTheme("strudelTheme");
      draw.setTheme({
        background: cssVar("--bg", "#0c0d10"),
        foreground: cssVar("--accent-cyan", "#5ef0ff"),
        caret: cssVar("--accent", "#ff3ec8"),
        selection: "rgba(94, 240, 255, 0.25)",
        selectionMatch: "rgba(255, 62, 200, 0.15)",
        lineHighlight: "rgba(255, 255, 255, 0.04)",
        gutterBackground: "transparent",
        gutterForeground: cssVar("--text-muted", "#8b919e"),
      });

      draw.getDrawContext(STRUDEL_PATTERN_CANVAS_ID, {
        pixelRatio: window.devicePixelRatio,
      });
    })().catch((err) => {
      visualsReady = null;
      throw err;
    });
  }
  return visualsReady;
}

export async function getStrudelPatternDrawContext(): Promise<
  CanvasRenderingContext2D | WebGLRenderingContext
> {
  await ensureStrudelVisuals();
  const { getDrawContext } = await import("@strudel/draw");
  return getDrawContext(STRUDEL_PATTERN_CANVAS_ID);
}
