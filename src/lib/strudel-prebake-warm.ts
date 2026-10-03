/** Pre-decode drums + GM used on day 2 so first Play does not throw EncodingError. */
async function warmDecodeUrl(
  ac: AudioContext,
  url: string,
  label: string,
): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`${label} HTTP ${res.status}`);
  }
  const buf = await res.arrayBuffer();
  await new Promise<AudioBuffer>((resolve, reject) => {
    ac.decodeAudioData(buf.slice(0), resolve, reject);
  });
}

export async function warmBeatoberPlaybackAssets(): Promise<void> {
  if (typeof window === "undefined") return;

  const { getAudioContext } = await import("@strudel/webaudio");
  const { getFontBufferSource } = await import(
    "@/lib/beatober-soundfont-fontloader.mjs"
  );

  const ac = getAudioContext();
  const base = "https://raw.githubusercontent.com/tidalcycles/uzu-drumkit/main/";
  const drumPaths = {
    bd: "bd/10_bd_switchangel.wav",
    sd: "sd/10_sd_switchangel-bounce-2.wav",
    hh: "hh/10_hh_switchangel.wav",
    oh: "oh/10_oh_switchangel.wav",
  } as const;

  await Promise.all(
    Object.entries(drumPaths).map(async ([d, path]) => {
      try {
        await warmDecodeUrl(ac, base + path, d);
      } catch (err) {
        console.warn(`[beatober warm] sample ${d}`, err);
      }
    }),
  );

  const gmChecks: { font: string; note: number | string }[] = [
    { font: "0040_FluidR3_GM_sf2_file", note: "f#4" },
    { font: "0520_FluidR3_GM_sf2_file", note: "f#3" },
    { font: "0380_FluidR3_GM_sf2_file", note: "f#1" },
    { font: "0110_FluidR3_GM_sf2_file", note: "f#5" },
    { font: "0530_FluidR3_GM_sf2_file", note: "f#4" },
  ];

  await Promise.all(
    gmChecks.map(async ({ font, note }) => {
      try {
        await getFontBufferSource(font, { note }, ac);
      } catch (err) {
        console.warn(`[beatober warm] soundfont ${font}`, err);
      }
    }),
  );
}
