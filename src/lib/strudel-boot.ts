"use client";

import { beatoberHydraScope, clearHydra } from "@/lib/beatober-hydra";
import {
  onStrudelAfterEval,
  onStrudelHush,
  onStrudelToggle,
  setStrudelRepl,
} from "@/lib/strudel-cm-bridge";
import {
  clearStrudelRuntimeError,
  formatStrudelErrorMessage,
  reportStrudelRuntimeError,
} from "@/lib/strudel-runtime-errors";
import { withQuietPatternEvalConsole } from "@/lib/strudel-eval-console";
import { beatoberDrawScope } from "@/lib/strudel-draw-bridge";
import { loadBeatoberSamples } from "@/lib/strudel-prebake";
import {
  clearGlobalPatternCanvas,
  ensureStrudelVisuals,
  STRUDEL_REPL_ID,
} from "@/lib/strudel-visuals";

export type StrudelBootStatus = "idle" | "loading" | "ready" | "error";

export type StrudelEvaluateResult =
  | { ok: true; value: unknown }
  | { ok: false };

export type StrudelSessionApi = {
  evaluate: (
    code: string,
    autoplay?: boolean,
  ) => Promise<StrudelEvaluateResult>;
  hush: () => void;
};

type ReplState = {
  error?: unknown;
  evalError?: unknown;
  schedulerError?: unknown;
  pending?: boolean;
};

type ReplHandle = {
  scheduler: { now: () => number; started: boolean };
  state: ReplState;
  evaluate: (code: string, autostart?: boolean) => Promise<unknown>;
};

type BootSnapshot = {
  status: StrudelBootStatus;
  bootError: string | null;
};

const listeners = new Set<(snap: BootSnapshot) => void>();

let status: StrudelBootStatus = "idle";
let bootError: string | null = null;
let api: StrudelSessionApi | null = null;
let repl: ReplHandle | null = null;
let bootPromise: Promise<StrudelSessionApi> | null = null;

function emit(): void {
  const snap = { status, bootError };
  for (const listener of listeners) listener(snap);
}

function syncReplRuntimeError(state: ReplState): void {
  const err = state.schedulerError ?? state.evalError ?? state.error;
  if (err) {
    reportStrudelRuntimeError(
      state.schedulerError ? "scheduler" : "eval",
      err,
    );
  } else if (!state.pending) {
    clearStrudelRuntimeError();
  }
}

export function subscribeStrudelBoot(
  listener: (snap: BootSnapshot) => void,
): () => void {
  listeners.add(listener);
  listener({ status, bootError });
  return () => listeners.delete(listener);
}

export function getStrudelBootSnapshot(): BootSnapshot {
  return { status, bootError };
}

/** Clears failed boot so ensureStrudelBoot can run again (visitor retry). */
export function resetStrudelBoot(): void {
  bootPromise = null;
  api = null;
  repl = null;
  status = "idle";
  bootError = null;
  emit();
}

export async function ensureStrudelBoot(): Promise<StrudelSessionApi> {
  if (api) return api;
  if (!bootPromise) {
    bootPromise = (async () => {
      status = "loading";
      bootError = null;
      emit();
      const started = performance.now();
      try {
        await ensureStrudelVisuals();
        const web = await import("@strudel/web");
        const nextRepl = (await web.initStrudel({
          id: STRUDEL_REPL_ID,
          beforeEval: async () => {
            clearStrudelRuntimeError();
            await clearGlobalPatternCanvas();
          },
          afterEval: (payload: unknown) => {
            void onStrudelAfterEval(
              payload as Parameters<typeof onStrudelAfterEval>[0],
            );
          },
          onToggle: (startedPlaying: boolean) => {
            void onStrudelToggle(startedPlaying);
          },
          onEvalError: (err: unknown) => {
            reportStrudelRuntimeError("eval", err);
          },
          onUpdateState: (state: ReplState) => {
            if (repl) repl.state = state;
            syncReplRuntimeError(state);
          },
          prebake: async () => {
            await ensureStrudelVisuals();
            await web.evalScope(
              import("@strudel/draw"),
              beatoberDrawScope(),
              import("@strudel/tonal"),
              import("@strudel/webaudio"),
              beatoberHydraScope(),
            );
            await loadBeatoberSamples();
          },
        })) as ReplHandle;

        repl = nextRepl;
        setStrudelRepl(nextRepl);

        const sessionApi: StrudelSessionApi = {
          evaluate: async (code, autoplay = true) => {
            clearStrudelRuntimeError();
            const result = await withQuietPatternEvalConsole(() =>
              nextRepl.evaluate(code, autoplay),
            );
            syncReplRuntimeError(nextRepl.state);
            const err =
              nextRepl.state.schedulerError ??
              nextRepl.state.evalError ??
              nextRepl.state.error;
            if (err) return { ok: false };
            return { ok: true, value: result };
          },
          hush: web.hush,
        };
        api = sessionApi;
        status = "ready";
        emit();
        const ms = Math.round(performance.now() - started);
        window.dispatchEvent(
          new CustomEvent("studiodaze-strudel-ready", { detail: { ms } }),
        );
        return sessionApi;
      } catch (err) {
        status = "error";
        bootError = formatStrudelErrorMessage(err);
        reportStrudelRuntimeError("boot", err);
        bootPromise = null;
        emit();
        throw err;
      }
    })();
  }
  return bootPromise;
}

/** Fire-and-forget prebake while the visitor reads the pattern (no AudioContext resume). */
export function warmStrudelBoot(): void {
  if (typeof window === "undefined") return;
  if (status === "ready" || status === "loading") return;
  void ensureStrudelBoot().catch(() => {
    /* UI shows boot error + retry */
  });
}

export function hushStrudelSync(): void {
  try {
    api?.hush();
  } catch (err) {
    reportStrudelRuntimeError("scheduler", err, "hush");
  }
}

export async function hushStrudelFull(): Promise<void> {
  hushStrudelSync();
  try {
    await onStrudelHush();
  } catch (err) {
    reportStrudelRuntimeError("draw", err, "hush visuals");
  }
  try {
    await clearHydra();
  } catch {
    /* hydra may never have started */
  }
}
