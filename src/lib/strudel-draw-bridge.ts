"use client";

import { STRUDEL_PATTERN_CANVAS_ID } from "@/lib/strudel-visuals";

type Pat = Record<string, (...args: unknown[]) => Pat> & {
  onPaint: (fn: (...args: unknown[]) => void) => Pat;
};

type VisualFn = (config?: Record<string, unknown>) => unknown;

let drawBridgeInstalled = false;

function ctxForGlobalDraw(
  getDrawContext: typeof import("@strudel/draw").getDrawContext,
  config: Record<string, unknown> = {},
) {
  const ctx = getDrawContext(STRUDEL_PATTERN_CANVAS_ID);
  const canvas = ctx.canvas as HTMLCanvasElement;
  const width = (config.width as number | undefined) ?? window.innerWidth;
  const height = (config.height as number | undefined) ?? window.innerHeight;
  if (config.width != null || config.height != null) {
    const pr = window.devicePixelRatio;
    canvas.width = width * pr;
    canvas.height = height * pr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }
  return ctx;
}

/** Full-page `#test-canvas` when a visual omits `ctx` (matches strudel.cc global draw). */
function bindGlobalDrawCtx(
  getDrawContext: typeof import("@strudel/draw").getDrawContext,
  proto: Record<string, unknown>,
  key: string,
): void {
  const orig = proto[key] as VisualFn | undefined;
  if (typeof orig !== "function") return;

  proto[key] = function (this: unknown, config: Record<string, unknown> = {}) {
    if (config.ctx) {
      return orig.call(this, config);
    }
    const ctx = ctxForGlobalDraw(getDrawContext, config);
    return orig.call(this, { ...config, ctx });
  };
}

/** `all(pianoroll)` / `all(punchcard({…}))` — same contract as `@strudel/draw` `pianoroll()`. */
function makeAllVisual(
  isPattern: (x: unknown) => boolean,
  method: string,
): (arg?: unknown) => unknown {
  return (arg?: unknown) => {
    if (arg !== undefined && isPattern(arg)) {
      return (arg as Pat)[method]();
    }
    const opts = (arg ?? {}) as Record<string, unknown>;
    return (pat: Pat) => pat[method](opts);
  };
}

const GLOBAL_DRAW_METHODS = [
  "punchcard",
  "wordfall",
  "spiral",
  "pitchwheel",
  "spectrum",
  "scope",
  "tscope",
  "fscope",
] as const;

/**
 * Stock Strudel draw/webaudio APIs on `#test-canvas`.
 * Pianoroll uses Drawer/onPaint (see commented path in `@strudel/draw/pianoroll.mjs`).
 */
export async function installGlobalDrawBridge(): Promise<void> {
  if (drawBridgeInstalled) return;
  drawBridgeInstalled = true;

  await import("@strudel/webaudio");

  const core = await import("@strudel/core");
  const draw = await import("@strudel/draw");

  const proto = core.Pattern.prototype as unknown as Record<string, unknown>;

  const origPianoroll = proto.pianoroll as VisualFn;
  proto.pianoroll = function (options: Record<string, unknown> = {}) {
    if (options.ctx) {
      return origPianoroll.call(this, options);
    }
    const { __pianoroll, getDrawOptions } = draw;
    return (this as Pat).onPaint((...args: unknown[]) => {
      const [ctx, time, haps, drawTime] = args as [
        CanvasRenderingContext2D,
        number,
        unknown[],
        [number, number],
      ];
      __pianoroll({
        ...options,
        ctx,
        time,
        haps,
        ...getDrawOptions(drawTime, { fold: 0, ...options }),
      });
    });
  };

  for (const key of GLOBAL_DRAW_METHODS) {
    bindGlobalDrawCtx(draw.getDrawContext, proto, key);
  }
}

/** Extra eval-scope bindings for `all(…)` helpers not exported from `@strudel/draw`. */
export async function beatoberDrawScope(): Promise<Record<string, unknown>> {
  await installGlobalDrawBridge();

  const draw = await import("@strudel/draw");
  const { isPattern } = await import("@strudel/core");

  void draw.getDrawContext(STRUDEL_PATTERN_CANVAS_ID);

  return {
    punchcard: makeAllVisual(isPattern, "punchcard"),
    wordfall: makeAllVisual(isPattern, "wordfall"),
    spiral: makeAllVisual(isPattern, "spiral"),
    pitchwheel: makeAllVisual(isPattern, "pitchwheel"),
  };
}
