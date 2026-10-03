declare module "@strudel/web" {
  export function initStrudel(
    options?: Record<string, unknown>,
  ): Promise<unknown>;
  export function evaluate(code: string, autoplay?: boolean): Promise<unknown>;
  export function hush(): void;
  export function evalScope(
    ...modules: Array<Promise<unknown> | Record<string, unknown>>
  ): Promise<unknown>;
  export function getTime(): number;
  export function getAudioContext(): AudioContext;
  export function reify(p: unknown): unknown;
  export const controls: { speed: unknown; shape: unknown };
}

declare module "@strudel/webaudio" {
  export function getAudioContext(): AudioContext;
  export function initAudio(options?: Record<string, unknown>): Promise<void>;
  export function samples(url: string): Promise<unknown>;
  export function registerSynthSounds(): Promise<unknown>;
  export function registerZZFXSounds(): Promise<unknown>;
  export function aliasBank(url: string): Promise<unknown>;
  export function soundAlias(original: string, alias: string): void;
}

declare module "@strudel/core" {
  export class Pattern {
    static prototype: Pattern;
    onPaint(fn: (...args: unknown[]) => void): Pattern;
    punchcard(options?: Record<string, unknown>): Pattern;
  }
  export function isPattern(value: unknown): boolean;
}

declare module "@strudel/transpiler" {
  export function registerWidgetType(type: string): void;
}

declare module "@strudel/soundfonts" {
  export function registerSoundfonts(): Promise<unknown>;
}

declare module "@strudel/draw" {
  export type StrudelDrawTheme = {
    background?: string;
    foreground?: string;
    caret?: string;
    selection?: string;
    selectionMatch?: string;
    lineHighlight?: string;
    gutterBackground?: string;
    gutterForeground?: string;
  };

  export function getDrawContext(
    id?: string,
    opts?: Record<string, unknown>,
  ): CanvasRenderingContext2D | WebGLRenderingContext;

  export function setTheme(theme: StrudelDrawTheme): void;

  export function cleanupDraw(clearScreen?: boolean, replId?: string): void;

  export function __pianoroll(options: Record<string, unknown>): void;
  export function getDrawOptions(
    drawTime: [number, number],
    options?: Record<string, unknown>,
  ): Record<string, unknown>;
  export function pianoroll(
    arg?: unknown,
  ): unknown | ((pat: unknown) => unknown);

  export class Drawer {
    drawTime: [number, number];
    constructor(
      onDraw: (
        haps: Array<{ isActive: (t: number) => boolean }>,
        time: number,
        drawer: Drawer,
        painters: PainterFn[] | undefined,
      ) => void,
      drawTime?: [number, number],
    );
    setDrawTime(drawTime: [number, number]): void;
    invalidate(
      scheduler: { now: () => number; pattern?: unknown },
      t?: number,
    ): void;
    start(scheduler: { now: () => number; pattern?: unknown }): void;
    stop(): void;
  }

  type PainterFn = (
    ctx: CanvasRenderingContext2D | WebGLRenderingContext,
    time: number,
    haps: unknown[],
    drawTime: [number, number],
  ) => void;
}

declare module "@strudel/tonal";

declare module "@strudel/codemirror" {
  import type { EditorView, ViewUpdate } from "@codemirror/view";

  export function updateMiniLocations(
    view: EditorView,
    locations: unknown[],
  ): void;
  export function highlightMiniLocations(
    view: EditorView,
    atTime: number,
    haps: unknown[],
  ): void;
  export function updateSliderWidgets(
    view: EditorView,
    widgets: unknown[],
  ): void;
  export function updateWidgets(view: EditorView, widgets: unknown[]): void;
  export function flash(view: EditorView, ms?: number): void;
  export function setWidget(id: string, el: HTMLElement): void;

  export const defaultSettings: Record<string, unknown>;
  export function initTheme(name: string): void;
  export function activateTheme(name: string): void;

  export const codemirrorSettings: {
    get(): Record<string, unknown>;
    set(value: Record<string, unknown>): void;
  };
  export function initEditor(options: {
    initialCode?: string;
    onChange?: (update: ViewUpdate) => void;
    onEvaluate?: () => void;
    onStop?: () => void;
    root: HTMLElement;
    mondo?: boolean;
  }): EditorView;
}

declare module "hydra-synth" {
  const Hydra: new (opts: Record<string, unknown>) => unknown;
  export default Hydra;
}
