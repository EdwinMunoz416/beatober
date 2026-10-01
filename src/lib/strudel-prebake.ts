/** Sample maps + synth registration aligned with strudel.cc default prebake (Web Audio). */

const DOUGH =
  "https://raw.githubusercontent.com/felixroos/dough-samples/main";
const TODEPOND = "https://raw.githubusercontent.com/todepond/samples/main";
const UZU = "https://raw.githubusercontent.com/tidalcycles/uzu-drumkit/main";

export async function loadBeatoberSamples(): Promise<void> {
  const { samples, registerSynthSounds, registerZZFXSounds, aliasBank } =
    await import("@strudel/webaudio");

  await Promise.all([
    registerSynthSounds(),
    registerZZFXSounds(),
    import("@strudel/soundfonts").then(({ registerSoundfonts }) =>
      registerSoundfonts(),
    ),
    samples(`${DOUGH}/tidal-drum-machines.json`),
    samples(`${DOUGH}/piano.json`),
    samples(`${DOUGH}/Dirt-Samples.json`),
    samples(`${DOUGH}/vcsl.json`),
    samples(`${DOUGH}/mridangam.json`),
    samples(`${UZU}/strudel.json`),
  ]);

  aliasBank(`${TODEPOND}/tidal-drum-machines-alias.json`);
}
