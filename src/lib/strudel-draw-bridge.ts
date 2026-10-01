"use client";

import { STRUDEL_PATTERN_CANVAS_ID } from "@/lib/strudel-visuals";

type Pat = {
  onPaint: (fn: (...args: unknown[]) => void) => Pat;
  punchcard: (options?: Record<string, unknown>) => Pat;
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

/**
 * Global draw: pianoroll → Drawer/onPaint; spectrum/scope → `#test-canvas` + `.draw()`.
 */
export async function installGlobalDrawBridge(): Promise<void> {
  if (drawBridgeInstalled) return;
  drawBridgeInstalled = true;

  await import("@strudel/webaudio");

  const core = await import("@strudel/core");
  const draw = await import("@strudel/draw");

  const proto = core.Pattern.prototype as Record<string, unknown>;

  const origPianoroll = proto.pianoroll as VisualFn;
  proto.pianoroll = function (options: Record<string, unknown> = {}) {
    if (options.ctx) {
      return origPianoroll.call(this, options);
    }
    const { __pianoroll, getDrawOptions } = draw;
    return (this as Pat).onPaint(
      (
        ctx: CanvasRenderingContext2D,
        time: number,
        haps: unknown[],
        drawTime: [number, number],
      ) => {
        __pianoroll({
          ...options,
          ctx,
          time,
          haps,
          ...getDrawOptions(drawTime, { fold: 0, ...options }),
        });
      },
    );
  };

  bindGlobalDrawCtx(draw.getDrawContext, proto, "spectrum");
  bindGlobalDrawCtx(draw.getDrawContext, proto, "tscope");
  bindGlobalDrawCtx(draw.getDrawContext, proto, "fscope");
  bindGlobalDrawCtx(draw.getDrawContext, proto, "spiral");
  bindGlobalDrawCtx(draw.getDrawContext, proto, "pitchwheel");
  bindGlobalDrawCtx(draw.getDrawContext, proto, "punchcard");
}

/** `all(punchcard)` helper + re-export `pianoroll` for eval scope. */
export async function beatoberDrawScope(): Promise<Record<string, unknown>> {
  await installGlobalDrawBridge();

  const draw = await import("@strudel/draw");
  const { isPattern } = await import("@strudel/core");

  const punchcard = (arg?: unknown) => {
    if (arg !== undefined && isPattern(arg)) {
      return (arg as Pat).punchcard();
    }
    const opts = (arg ?? {}) as Record<string, unknown>;
    return (pat: Pat) => pat.punchcard(opts);
  };

  void draw.getDrawContext(STRUDEL_PATTERN_CANVAS_ID);

  return { pianoroll: draw.pianoroll, punchcard };
}
