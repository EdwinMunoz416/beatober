"use client";

import { useEffect, useState, type ReactNode } from "react";
import { BeatoberInitialLoadingScreen } from "@/components/BeatoberInitialLoadingScreen";
import { ensureStrudelBoot } from "@/lib/strudel-boot";
import { ensureStrudelVisuals } from "@/lib/strudel-visuals";

const SESSION_KEY = "studiodaze-beatober-client-ready";

type Props = {
  children: ReactNode;
};

async function prepareClientSession(): Promise<void> {
  await ensureStrudelVisuals();
  try {
    await ensureStrudelBoot();
  } catch {
    /* Repl shows retry; still reveal app */
  }
}

/** First visit per tab: full-screen loader while Strudel prebakes (patterns preloaded on server). */
export function BeatoberInitialVisitGate({ children }: Props) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === "1") {
      setReady(true);
      void prepareClientSession();
      return;
    }

    let cancelled = false;
    void prepareClientSession().then(() => {
      if (cancelled) return;
      sessionStorage.setItem(SESSION_KEY, "1");
      setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return <BeatoberInitialLoadingScreen />;
  }

  return children;
}
