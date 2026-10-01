"use client";

import type { EditorView } from "@codemirror/view";

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
    getPainters?: () => unknown[];
  };
  meta?: {
    miniLocations?: unknown[];
    widgets?: Array<{ type?: string }>;
  };
};

type DrawerLike = {
  setDrawTime: (t: [number, number]) => void;
  invalidate: (scheduler: ReplScheduler, t?: number) => void;
  start: (scheduler: ReplScheduler) => void;
  stop: () => void;
};

let editorView: EditorView | null = null;
let replInstance: ReplInstance | null = null;
let drawer: DrawerLike | null = null;

export function setStrudelEditorView(view: EditorView | null): void {
  editorView = view;
}

export function setStrudelRepl(repl: ReplInstance | null): void {
  replInstance = repl;
}

async function onDrawerFrame(
  haps: Array<{ isActive: (t: number) => boolean }>,
  time: number,
): Promise<void> {
  if (!editorView) return;
  const { highlightMiniLocations } = await import("@strudel/codemirror");
  const active = haps.filter((h) => h.isActive(time));
  highlightMiniLocations(editorView, time, active);
}

async function ensureDrawer(): Promise<DrawerLike> {
  if (drawer) return drawer;
  const { Drawer } = await import("@strudel/draw");
  drawer = new Drawer((haps, time) => {
    void onDrawerFrame(haps, time);
  }, [0, 0]) as DrawerLike;
  return drawer;
}

export async function onStrudelAfterEval(payload: AfterEvalPayload): Promise<void> {
  const view = editorView;
  if (!view) return;

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

  const d = await ensureDrawer();

  const painters = payload.pattern?.getPainters?.() ?? [];
  d.setDrawTime(painters.length ? [0, 0] : [0, 0]);

  if (replInstance?.scheduler) {
    d.invalidate(replInstance.scheduler);
    if (replInstance.scheduler.started) {
      d.start(replInstance.scheduler);
    }
  }
}

export async function onStrudelToggle(started: boolean): Promise<void> {
  const view = editorView;
  const cm = await import("@strudel/codemirror");

  if (!started) {
    drawer?.stop();
    if (view) cm.updateMiniLocations(view, []);
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
    const cm = await import("@strudel/codemirror");
    cm.updateMiniLocations(view, []);
  }
}
