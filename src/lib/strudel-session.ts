"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ensureStrudelBoot,
  getStrudelBootSnapshot,
  hushStrudelFull,
  hushStrudelSync,
  resetStrudelBoot,
  subscribeStrudelBoot,
  type StrudelSessionApi,
} from "@/lib/strudel-boot";
import {
  clearStrudelRuntimeError,
  subscribeStrudelRuntimeError,
  type StrudelRuntimeError,
} from "@/lib/strudel-runtime-errors";

export type {
  StrudelBootStatus,
  StrudelEvaluateResult,
  StrudelSessionApi,
} from "@/lib/strudel-boot";

export function useStrudelSession() {
  const [bootSnap, setBootSnap] = useState(getStrudelBootSnapshot);

  const [runtimeError, setRuntimeError] = useState<StrudelRuntimeError | null>(
    null,
  );

  useEffect(() => {
    return subscribeStrudelBoot(setBootSnap);
  }, []);

  useEffect(() => subscribeStrudelRuntimeError(setRuntimeError), []);

  const ensureApi = useCallback(async (): Promise<StrudelSessionApi> => {
    return ensureStrudelBoot();
  }, []);

  const evaluate = useCallback(
    async (code: string) => {
      const api = await ensureStrudelBoot();
      return api.evaluate(code, true);
    },
    [],
  );

  const hushSync = useCallback(() => {
    hushStrudelSync();
  }, []);

  const hush = useCallback(async () => {
    await hushStrudelFull();
  }, []);

  const clearRuntimeError = useCallback(() => {
    clearStrudelRuntimeError();
  }, []);

  const retryBoot = useCallback(() => {
    resetStrudelBoot();
    void ensureStrudelBoot().catch(() => {});
  }, []);

  return {
    status: bootSnap.status,
    bootError: bootSnap.bootError,
    runtimeError,
    clearRuntimeError,
    ensureApi,
    evaluate,
    hush,
    hushSync,
    retryBoot,
  };
}
