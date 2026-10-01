"use client";

import { useEffect, useState } from "react";
import {
  formatStrudelErrorMessage,
  reportStrudelRuntimeError,
} from "@/lib/strudel-runtime-errors";
import { ensureStrudelVisuals } from "@/lib/strudel-visuals";

/** Mount once on playable surfaces so `getDrawContext`, CM widgets, and draw theme exist. */
export function StrudelVisualBootstrap() {
  const [, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void ensureStrudelVisuals()
      .then(() => {
        if (!cancelled) setTick(1);
      })
      .catch((err) => {
        reportStrudelRuntimeError("boot", err, "visual bootstrap");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}

export function useStrudelVisualBootFailed(): string | null {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    void ensureStrudelVisuals().catch((err) => {
      setMsg(formatStrudelErrorMessage(err));
    });
  }, []);
  return msg;
}
