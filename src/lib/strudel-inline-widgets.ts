"use client";

type InlinePat = {
  tag: (id: string) => InlinePat;
  pianoroll: (o: Record<string, unknown>) => InlinePat;
  punchcard: (o: Record<string, unknown>) => InlinePat;
  spiral: (o: Record<string, unknown>) => InlinePat;
  scope: (o: Record<string, unknown>) => InlinePat;
  pitchwheel: (o: Record<string, unknown>) => InlinePat;
  spectrum: (o: Record<string, unknown>) => InlinePat;
};

/** CM widget.mjs patches Pattern at import time — must match the Pattern class the repl evaluates. */
export async function ensureStrudelInlineWidgets(): Promise<void> {
  const { Pattern } = await import("@strudel/core");
  const proto = Pattern.prototype as unknown as Record<string, unknown>;
  if (typeof proto._punchcard === "function") return;

  const { registerWidgetType } = await import("@strudel/transpiler");
  const { setWidget } = await import("@strudel/codemirror");

  const register = (
    type: string,
    fn: (
      id: string,
      options: Record<string, unknown>,
      pat: InlinePat,
    ) => InlinePat,
  ) => {
    registerWidgetType(type);
    proto[type] = function (
      this: InlinePat,
      id: string,
      options: Record<string, unknown> = { fold: 1 },
    ) {
      return fn(id, options, this);
    };
  };

  const getCanvasWidget = (id: string, options: Record<string, unknown> = {}) => {
    const width = (options.width as number) ?? 500;
    const height = (options.height as number) ?? 60;
    const pixelRatio = window.devicePixelRatio;
    let canvas = document.getElementById(id) as HTMLCanvasElement | null;
    if (!canvas) canvas = document.createElement("canvas");
    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    setWidget(id, canvas);
    return canvas;
  };

  register("_pianoroll", (id, options, pat) => {
    const ctx = getCanvasWidget(id, options).getContext("2d")!;
    return pat.tag(id).pianoroll({ fold: 1, ...options, ctx, id });
  });

  register("_punchcard", (id, options, pat) => {
    const ctx = getCanvasWidget(id, options).getContext("2d")!;
    return pat.tag(id).punchcard({ fold: 1, ...options, ctx, id });
  });

  register("_spiral", (id, options, pat) => {
    const size = (options.size as number) || 275;
    const opts = { width: size, height: size, ...options, size: size / 5 };
    const ctx = getCanvasWidget(id, opts).getContext("2d")!;
    return pat.tag(id).spiral({ ...opts, ctx, id });
  });

  register("_scope", (id, options, pat) => {
    const opts = { width: 500, height: 60, pos: 0.5, scale: 1, ...options };
    const ctx = getCanvasWidget(id, opts).getContext("2d")!;
    return pat.tag(id).scope({ ...opts, ctx, id });
  });

  register("_pitchwheel", (id, options, pat) => {
    const size = (options.size as number) || 200;
    const opts = { width: size, height: size, ...options, size: size / 5 };
    const ctx = getCanvasWidget(id, opts).getContext("2d")!;
    return pat.tag(id).pitchwheel({ ...opts, ctx, id });
  });

  register("_spectrum", (id, options, pat) => {
    const size = (options.size as number) || 200;
    const opts = { width: size, height: size, ...options, size: size / 5 };
    const ctx = getCanvasWidget(id, opts).getContext("2d")!;
    return pat.tag(id).spectrum({ ...opts, ctx, id });
  });
}
