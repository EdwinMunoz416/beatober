"use client";

/** Load superdough AudioWorklets before synths / LFO / spectrum analyzers run. */
let audioInitPromise: Promise<void> | null = null;

export async function ensureStrudelAudioReady(): Promise<void> {
  if (typeof window === "undefined") return;

  if (!audioInitPromise) {
    audioInitPromise = (async () => {
      const { getAudioContext, initAudio } = await import("@strudel/webaudio");
      const ctx = getAudioContext();
      if (ctx.state === "suspended") {
        await ctx.resume();
      }
      await initAudio();
    })().catch((err) => {
      audioInitPromise = null;
      throw err;
    });
  }

  return audioInitPromise;
}
