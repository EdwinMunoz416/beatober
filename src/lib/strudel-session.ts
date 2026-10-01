"use client";

import { useCallback, useRef, useState } from "react";
import { beatoberHydraScope, clearHydra } from "@/lib/beatober-hydra";
import { loadBeatoberSamples } from "@/lib/strudel-prebake";

export type StrudelBootStatus = "idle" | "loading" | "ready" | "error";

export type StrudelSessionApi = {
  evaluate: (code: string, autoplay?: boolean) => Promise<unknown>;
  hush: () => void;
};

export function useStrudelSession() {
  const [status, setStatus] = useState<StrudelBootStatus>("idle");
  const [bootError, setBootError] = useState<string | null>(null);
  const apiRef = useRef<StrudelSessionApi | null>(null);
  const bootPromiseRef = useRef<Promise<StrudelSessionApi> | null>(null);

  const ensureApi = useCallback(async (): Promise<StrudelSessionApi> => {
    if (apiRef.current) return apiRef.current;
    if (!bootPromiseRef.current) {
      bootPromiseRef.current = (async () => {
        setStatus("loading");
        setBootError(null);
        const started = performance.now();
        try {
          const web = await import("@strudel/web");
          await web.initStrudel({
            prebake: async () => {
              await web.evalScope(
                import("@strudel/draw"),
                import("@strudel/tonal"),
                beatoberHydraScope(),
              );
              await loadBeatoberSamples();
            },
          });
          const api: StrudelSessionApi = {
            evaluate: web.evaluate,
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
          const msg = err instanceof Error ? err.message : String(err);
          setBootError(msg);
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
    } catch {
      /* ignore */
    }
    try {
      await clearHydra();
    } catch {
      /* hydra may never have started */
    }
  }, []);

  return {
    status,
    bootError,
    ensureApi,
    evaluate,
    hush,
  };
}
