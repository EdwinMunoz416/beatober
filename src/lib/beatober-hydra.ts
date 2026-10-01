/**
 * Beatober Hydra shim — same API as `@strudel/hydra`; static `hydra-synth` import for Turbopack.
 * Client-only via dynamic import from the Strudel session boot.
 */

type HydraOptions = {
  src?: string;
  feedStrudel?: boolean;
  contextType?: string;
  pixelRatio?: number;
  pixelated?: boolean;
  detectAudio?: boolean;
  [key: string]: unknown;
};

type HydraInstance = {
  hush: () => void;
  synth: { s0: { init: (opts: { src: HTMLCanvasElement }) => void } };
};

type GlobalWithHydra = typeof globalThis & {
  s0?: { clear?: () => void };
  speed?: unknown;
  shape?: unknown;
};

type PatternLike = {
  queryArc: (a: number, b: number) => Array<{ value: unknown }>;
};

type StrudelWebCore = {
  getTime: () => number;
  reify: (p: unknown) => PatternLike;
  controls: { speed: unknown; shape: unknown };
};

let latestOptions: HydraOptions | undefined;
let hydra: HydraInstance | undefined;
let webCore: StrudelWebCore | undefined;

async function ensureWebCore(): Promise<StrudelWebCore> {
  if (webCore) return webCore;
  const web = (await import("@strudel/web")) as unknown as StrudelWebCore;
  webCore = {
    getTime: web.getTime,
    reify: web.reify,
    controls: web.controls,
  };
  return webCore;
}

async function loadHydraCtor(): Promise<
  new (opts: Record<string, unknown>) => HydraInstance
> {
  const mod = await import("hydra-synth");
  const Ctor = (mod as { default?: unknown }).default ?? mod;
  return Ctor as new (opts: Record<string, unknown>) => HydraInstance;
}

export async function initHydra(
  options: HydraOptions = {},
): Promise<HydraInstance | undefined> {
  await ensureWebCore();
  const { getDrawContext } = await import("@strudel/draw");

  if (
    latestOptions &&
    JSON.stringify(latestOptions) !== JSON.stringify(options)
  ) {
    document.getElementById("hydra-canvas")?.remove();
  }
  latestOptions = options;

  if (!document.getElementById("hydra-canvas")) {
    const {
      src: _src,
      feedStrudel = false,
      contextType = "webgl",
      pixelRatio = 1,
      pixelated = true,
      ...rest
    } = {
      detectAudio: false,
      ...options,
    };

    const hydraConfig: Record<string, unknown> = { ...rest };

    const ctx = getDrawContext("hydra-canvas", {
      contextType,
      pixelRatio,
      pixelated,
    });
    hydraConfig.canvas = ctx.canvas;

    const Hydra = await loadHydraCtor();
    hydra = new Hydra(hydraConfig);

    if (feedStrudel) {
      const feedCtx = getDrawContext();
      const feedCanvas = feedCtx.canvas;
      if (feedCanvas instanceof HTMLCanvasElement) {
        feedCanvas.style.display = "none";
        hydra.synth.s0.init({ src: feedCanvas });
      }
    }
  }

  return hydra;
}

export async function clearHydra(): Promise<void> {
  const core = await ensureWebCore();
  if (hydra) {
    hydra.hush();
  }
  const g = globalThis as GlobalWithHydra;
  g.s0?.clear?.();
  document.getElementById("hydra-canvas")?.remove();
  g.speed = core.controls.speed;
  g.shape = core.controls.shape;
  hydra = undefined;
  latestOptions = undefined;
}

export function H(p: unknown): () => number {
  return () => {
    if (!webCore) {
      throw new Error("initHydra / beatober hydra scope not ready");
    }
    const t = webCore.getTime();
    const hap = webCore.reify(p).queryArc(t, t + 1e-4)[0];
    const raw = hap?.value;
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
    if (raw && typeof raw === "object") {
      const bag = raw as Record<string, unknown>;
      for (const key of ["gain", "amp", "velocity", "value", "n", "note"]) {
        const n = Number(bag[key]);
        if (Number.isFinite(n)) return n;
      }
    }
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  };
}

export async function beatoberHydraScope(): Promise<{
  initHydra: typeof initHydra;
  clearHydra: typeof clearHydra;
  H: typeof H;
}> {
  await ensureWebCore();
  return { initHydra, clearHydra, H };
}
