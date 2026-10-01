"use client";

import { installGlobalDrawBridge } from "@/lib/strudel-draw-bridge";
import { ensureStrudelInlineWidgets } from "@/lib/strudel-inline-widgets";

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

export function setGlobalPatternDrawActive(active: boolean): void {
  if (typeof document === "undefined") return;
  document.body.classList.toggle("strudel-global-draw-active", active);
}

export async function clearGlobalPatternCanvas(): Promise<void> {
  setGlobalPatternDrawActive(false);
  try {
    const draw = await import("@strudel/draw");
    // No repl id — `.pianoroll()` / `.draw()` use numeric rAF ids (e.g. `1`), not repl-scoped keys.
    draw.cleanupDraw(true);
    const ctx = draw.getDrawContext(STRUDEL_PATTERN_CANVAS_ID);
    if ("clearRect" in ctx) {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }
  } catch {
    /* draw may not be booted */
  }
}

/** Canvas layer + CM widget types + draw theme (client-only). */
export function ensureStrudelVisuals(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }
  if (!visualsReady) {
    visualsReady = (async () => {
      await ensureStrudelInlineWidgets();
      await installGlobalDrawBridge();

      const draw = await import("@strudel/draw");
      const cm = await import("@strudel/codemirror");

      cm.initTheme("strudelTheme");
      draw.setTheme({
        background: "transparent",
        foreground: cssVar("--accent-cyan", "#5ef0ff"),
        caret: cssVar("--accent", "#ff3ec8"),
        selection: "rgba(94, 240, 255, 0.25)",
        selectionMatch: "rgba(255, 62, 200, 0.15)",
        lineHighlight: "rgba(255, 255, 255, 0.04)",
        gutterBackground: "transparent",
        gutterForeground: cssVar("--text-muted", "#8b919e"),
      });

      const ctx = draw.getDrawContext(STRUDEL_PATTERN_CANVAS_ID, {
        pixelRatio: window.devicePixelRatio,
      });
      if (ctx.canvas instanceof HTMLCanvasElement) {
        ctx.canvas.style.zIndex = "30";
        ctx.canvas.style.pointerEvents = "none";
      }
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
