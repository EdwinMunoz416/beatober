/**
 * Stops Strudel before day / route changes. The active StrudelRepl registers a
 * handler; fallback calls @strudel/web when switching to locked days (REPL unmount).
 */

type StopHandler = () => void;

let activeStop: StopHandler | null = null;

export function registerStrudelPlaybackStop(handler: StopHandler): () => void {
  activeStop = handler;
  return () => {
    if (activeStop === handler) activeStop = null;
  };
}

/** Sync scheduler stop + UI teardown; safe to call right before setState(day). */
export function stopStrudelForDayChange(): void {
  if (activeStop) {
    activeStop();
    return;
  }
  void fallbackHush();
}

async function fallbackHush(): Promise<void> {
  try {
    const { hushStrudelFull } = await import("@/lib/strudel-boot");
    await hushStrudelFull();
  } catch {
    try {
      const web = await import("@strudel/web");
      web.hush();
    } catch {
      /* not booted */
    }
  }
}
