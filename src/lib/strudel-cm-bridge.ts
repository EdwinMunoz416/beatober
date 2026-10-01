"use client";

import type { EditorView } from "@codemirror/view";
import { reportStrudelRuntimeError } from "@/lib/strudel-runtime-errors";
import {
  ensureStrudelVisuals,
  getStrudelPatternDrawContext,
  STRUDEL_DRAW_TIME,
  STRUDEL_REPL_ID,
} from "@/lib/strudel-visuals";

type ReplScheduler = {
  now: () => number;
  started: boolean;
  pattern?: { queryArc: (a: number, b: number, o?: object) => unknown[] };
};

type ReplInstance = {
  scheduler: ReplScheduler;
};

type AfterEvalPayload = {
  code?: string;
  pattern?: {
    getPainters?: () => Array<
      (
        ctx: CanvasRenderingContext2D | WebGLRenderingContext,
        time: number,
        haps: unknown[],
        drawTime: [number, number],
      ) => void
    >;
  };
  meta?: {
    miniLocations?: unknown[];
    widgets?: Array<{ type?: string }>;
  };
};

type DrawerLike = {
  drawTime: [number, number];
  setDrawTime: (t: [number, number]) => void;
  invalidate: (scheduler: ReplScheduler, t?: number) => void;
  start: (scheduler: ReplScheduler) => void;
  stop: () => void;
};

type PainterFn = (
  ctx: CanvasRenderingContext2D | WebGLRenderingContext,
  time: number,
  haps: unknown[],
  drawTime: [number, number],
) => void;

let editorView: EditorView | null = null;
let replInstance: ReplInstance | null = null;
let drawer: DrawerLike | null = null;

export function setStrudelEditorView(view: EditorView | null): void {
  editorView = view;
}

export function setStrudelRepl(repl: ReplInstance | null): void {
  replInstance = repl;
}

function runPainters(
  painters: PainterFn[] | undefined,
  time: number,
  haps: unknown[],
  drawTime: [number, number],
): void {
  if (!painters?.length) return;
  void (async () => {
    try {
      await ensureStrudelVisuals();
      const ctx = await getStrudelPatternDrawContext();
      for (const painter of painters) {
        try {
          painter(ctx, time, haps, drawTime);
        } catch (err) {
          reportStrudelRuntimeError("draw", err, "pattern painter");
        }
      }
    } catch (err) {
      reportStrudelRuntimeError("draw", err, "draw context");
    }
  })();
}

async function onDrawerFrame(
  haps: Array<{ isActive: (t: number) => boolean }>,
  time: number,
  _drawer: DrawerLike,
  painters: PainterFn[] | undefined,
): Promise<void> {
  if (editorView) {
    try {
      const { highlightMiniLocations } = await import("@strudel/codemirror");
      const active = haps.filter((h) => h.isActive(time));
      highlightMiniLocations(editorView, time, active);
    } catch (err) {
      reportStrudelRuntimeError("draw", err, "mini highlight");
    }
  }
  runPainters(painters, time, haps, drawer?.drawTime ?? [0, 0]);
}

async function ensureDrawer(): Promise<DrawerLike> {
  if (drawer) return drawer;
  await ensureStrudelVisuals();
  const { Drawer } = await import("@strudel/draw");
  drawer = new Drawer(
    (
      haps: Array<{ isActive: (t: number) => boolean }>,
      time: number,
      d: DrawerLike,
      painters: PainterFn[] | undefined,
    ) => {
      void onDrawerFrame(haps, time, d, painters);
    },
    [0, 0],
  ) as DrawerLike;
  return drawer;
}

export async function onStrudelAfterEval(payload: AfterEvalPayload): Promise<void> {
  const view = editorView;
  if (!view) return;

  try {
    const cm = await import("@strudel/codemirror");
    const miniLocations = payload.meta?.miniLocations ?? [];
    const widgets = payload.meta?.widgets ?? [];

    cm.updateMiniLocations(view, miniLocations);
    cm.updateSliderWidgets(
      view,
      widgets.filter((w) => w.type === "slider"),
    );
    cm.updateWidgets(
      view,
      widgets.filter((w) => w.type !== "slider"),
    );
    cm.flash(view);
  } catch (err) {
    reportStrudelRuntimeError("draw", err, "codemirror widgets");
  }

  const d = await ensureDrawer();

  const painters = payload.pattern?.getPainters?.() ?? [];
  d.setDrawTime(painters.length ? STRUDEL_DRAW_TIME : [0, 0]);

  if (replInstance?.scheduler) {
    d.invalidate(replInstance.scheduler);
    if (replInstance.scheduler.started) {
      d.start(replInstance.scheduler);
    }
  }
}

export async function onStrudelToggle(started: boolean): Promise<void> {
  const view = editorView;

  if (!started) {
    drawer?.stop();
    if (view) {
      try {
        const cm = await import("@strudel/codemirror");
        cm.updateMiniLocations(view, []);
      } catch {
        /* ignore */
      }
    }
    return;
  }

  if (!replInstance?.scheduler) return;
  const d = await ensureDrawer();
  d.start(replInstance.scheduler);
}

export async function onStrudelHush(): Promise<void> {
  drawer?.stop();
  const view = editorView;
  if (view) {
    try {
      const cm = await import("@strudel/codemirror");
      cm.updateMiniLocations(view, []);
    } catch {
      /* ignore */
    }
  }
  try {
    const { cleanupDraw } = await import("@strudel/draw");
    cleanupDraw(true, STRUDEL_REPL_ID);
  } catch {
    /* ignore */
  }
}
