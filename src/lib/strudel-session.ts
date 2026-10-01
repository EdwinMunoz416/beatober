"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  subscribeStrudelRuntimeError,
  type StrudelRuntimeError,
} from "@/lib/strudel-runtime-errors";
import { withQuietPatternEvalConsole } from "@/lib/strudel-eval-console";
import { loadBeatoberSamples } from "@/lib/strudel-prebake";
import {
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

export function useStrudelSession() {
  const [status, setStatus] = useState<StrudelBootStatus>("idle");
  const [bootError, setBootError] = useState<string | null>(null);
  const [runtimeError, setRuntimeError] = useState<StrudelRuntimeError | null>(
    null,
  );
  const apiRef = useRef<StrudelSessionApi | null>(null);
  const replRef = useRef<ReplHandle | null>(null);
  const bootPromiseRef = useRef<Promise<StrudelSessionApi> | null>(null);

  useEffect(() => subscribeStrudelRuntimeError(setRuntimeError), []);

  const ensureApi = useCallback(async (): Promise<StrudelSessionApi> => {
    if (apiRef.current) return apiRef.current;
    if (!bootPromiseRef.current) {
      bootPromiseRef.current = (async () => {
        setStatus("loading");
        setBootError(null);
        const started = performance.now();
        try {
          await ensureStrudelVisuals();
          const web = await import("@strudel/web");
          const repl = (await web.initStrudel({
            id: STRUDEL_REPL_ID,
            beforeEval: async () => {
              clearStrudelRuntimeError();
              const { cleanupDraw } = await import("@strudel/draw");
              cleanupDraw(true, STRUDEL_REPL_ID);
            },
            afterEval: (payload: unknown) => {
              void onStrudelAfterEval(
                payload as Parameters<typeof onStrudelAfterEval>[0],
              );
            },
            onToggle: (started: boolean) => {
              void onStrudelToggle(started);
            },
            onEvalError: (err: unknown) => {
              reportStrudelRuntimeError("eval", err);
            },
            onUpdateState: (state: ReplState) => {
              if (replRef.current) {
                replRef.current.state = state;
              }
              syncReplRuntimeError(state);
            },
            prebake: async () => {
              await web.evalScope(
                import("@strudel/draw"),
                import("@strudel/tonal"),
                import("@strudel/webaudio"),
                beatoberHydraScope(),
              );
              await loadBeatoberSamples();
            },
          })) as ReplHandle;

          replRef.current = repl;
          setStrudelRepl(repl);

          const api: StrudelSessionApi = {
            evaluate: async (code, autoplay = true) => {
              clearStrudelRuntimeError();
              const result = await withQuietPatternEvalConsole(() =>
                repl.evaluate(code, autoplay),
              );
              syncReplRuntimeError(repl.state);
              const err =
                repl.state.schedulerError ??
                repl.state.evalError ??
                repl.state.error;
              if (err) {
                // Expected pattern/transpile failures — UI reads runtimeError; do not throw (Next dev overlay).
                return { ok: false };
              }
              return { ok: true, value: result };
            },
            hush: web.hush,
          };
          apiRef.current = api;
          setStatus("ready");
          if (typeof window !== "undefined") {
            const ms = Math.round(performance.now() - started);
            window.dispatchEvent(
              new CustomEvent("studiodaze-strudel-ready", { detail: { ms } }),
            );
          }
          return api;
        } catch (err) {
          setStatus("error");
          const msg = formatStrudelErrorMessage(err);
          setBootError(msg);
          reportStrudelRuntimeError("boot", err);
          bootPromiseRef.current = null;
          throw err;
        }
      })();
    }
    return bootPromiseRef.current;
  }, []);

  const evaluate = useCallback(
    async (code: string) => {
      const api = await ensureApi();
      return api.evaluate(code, true);
    },
    [ensureApi],
  );

  const hush = useCallback(async () => {
    try {
      apiRef.current?.hush();
    } catch (err) {
      reportStrudelRuntimeError("scheduler", err, "hush");
    }
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
  }, []);

  const clearRuntimeError = useCallback(() => {
    clearStrudelRuntimeError();
  }, []);

  return {
    status,
    bootError,
    runtimeError,
    clearRuntimeError,
    ensureApi,
    evaluate,
    hush,
  };
}
