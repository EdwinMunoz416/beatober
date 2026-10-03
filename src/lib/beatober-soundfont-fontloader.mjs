/**
 * Strudel GM soundfonts with decode fallbacks (upstream fontloader drops decode rejections).
 */
import { noteToMidi, freqToMidi, getSoundIndex } from "@strudel/core";
import {
  getAudioContext,
  registerSound,
  getParamADSR,
  getADSRValues,
  getPitchEnvelope,
  getVibratoOscillator,
  onceEnded,
  releaseAudioNode,
} from "@strudel/webaudio";
import gm from "@strudel/soundfonts/gm.mjs";

let soundfontUrl = "https://felixroos.github.io/webaudiofontdata/sound";

export function setSoundfontUrl(value) {
  soundfontUrl = value;
}

const loadCache = {};
async function loadFont(name) {
  if (loadCache[name]) {
    return loadCache[name];
  }
  const load = async () => {
    const url = `${soundfontUrl}/${name}.js`;
    const preset = await fetch(url).then(async (res) => {
      if (!res.ok) {
        throw new Error(`soundfont HTTP ${res.status}: ${url}`);
      }
      return res.text();
    });
    const split = preset.split("={");
    if (split.length < 2) {
      throw new Error(`soundfont parse failed: ${url}`);
    }
    const data = split[1];
    return eval("{" + data);
  };
  loadCache[name] = load().catch((err) => {
    delete loadCache[name];
    throw err;
  });
  return loadCache[name];
}

export async function getFontBufferSource(name, value, ac) {
  let { note = "c3", freq } = value;
  let midi;
  if (freq) {
    midi = freqToMidi(freq);
  } else if (typeof note === "string") {
    midi = noteToMidi(note);
  } else if (typeof note === "number") {
    midi = note;
  } else {
    throw new Error(`unexpected "note" type "${typeof note}"`);
  }

  const { buffer, zone } = await getFontPitch(name, midi, ac);
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const baseDetune =
    zone.originalPitch - 100.0 * zone.coarseTune - zone.fineTune;
  const playbackRate =
    1.0 * Math.pow(2, (100.0 * midi - baseDetune) / 1200.0);
  src.playbackRate.value = playbackRate;
  const loop = zone.loopStart > 1 && zone.loopStart < zone.loopEnd;
  if (loop) {
    src.loop = true;
    src.loopStart = zone.loopStart / zone.sampleRate;
    src.loopEnd = zone.loopEnd / zone.sampleRate;
  }
  return src;
}

const bufferCache = {};
export async function getFontPitch(name, pitch, ac) {
  const key = `${name}:::${pitch}`;
  if (bufferCache[key]) {
    return bufferCache[key];
  }
  const load = async () => {
    const preset = await loadFont(name);
    if (!preset) {
      throw new Error(`Could not load soundfont ${name}`);
    }
    const zone = findZone(preset, pitch);
    if (!zone) {
      throw new Error(
        `no soundfont zone for preset ${name}, pitch ${pitch}`,
      );
    }
    const buffer = await getBuffer(zone, ac);
    if (!buffer) {
      throw new Error(
        `no soundfont buffer for preset ${name}, pitch ${pitch}`,
      );
    }
    return { buffer, zone };
  };
  bufferCache[key] = load().catch((err) => {
    delete bufferCache[key];
    throw err;
  });
  return bufferCache[key];
}

function findZone(preset, pitch) {
  return preset.find((zone) => {
    return zone.keyRangeLow <= pitch && zone.keyRangeHigh + 1 >= pitch;
  });
}

function decodeZoneFile(zone, audioContext) {
  if (!zone.file) return Promise.resolve(null);
  const datalen = zone.file.length;
  const arraybuffer = new ArrayBuffer(datalen);
  const view = new Uint8Array(arraybuffer);
  const decoded = atob(zone.file);
  for (let i = 0; i < decoded.length; i++) {
    view[i] = decoded.charCodeAt(i);
  }
  return new Promise((resolve, reject) => {
    audioContext.decodeAudioData(arraybuffer, resolve, (err) => {
      reject(
        err instanceof Error
          ? err
          : new DOMException("Unable to decode audio data", "EncodingError"),
      );
    });
  });
}

async function getBuffer(zone, audioContext) {
  if (zone.sample) {
    const decoded = atob(zone.sample);
    zone.buffer = audioContext.createBuffer(
      1,
      decoded.length / 2,
      zone.sampleRate,
    );
    const float32Array = zone.buffer.getChannelData(0);
    for (let i = 0; i < decoded.length / 2; i++) {
      let b1 = decoded.charCodeAt(i * 2);
      let b2 = decoded.charCodeAt(i * 2 + 1);
      if (b1 < 0) b1 = 256 + b1;
      if (b2 < 0) b2 = 256 + b2;
      let n = b2 * 256 + b1;
      if (n >= 65536 / 2) n = n - 65536;
      float32Array[i] = n / 65536.0;
    }
    return zone.buffer;
  }
  if (zone.file) {
    return decodeZoneFile(zone, audioContext);
  }
  return null;
}

async function playGmPreset(time, value, onended, fonts) {
  const [attack, decay, sustain, release] = getADSRValues([
    value.attack,
    value.decay,
    value.sustain,
    value.release,
  ]);

  const { duration } = value;
  const n = getSoundIndex(value.n, fonts.length);
  const ctx = getAudioContext();
  let lastErr;
  for (let attempt = 0; attempt < fonts.length; attempt++) {
    const font = fonts[(n + attempt) % fonts.length];
    try {
      const bufferSource = await getFontBufferSource(font, value, ctx);
      bufferSource.start(time);
      const envGain = ctx.createGain();
      const node = bufferSource.connect(envGain);
      const holdEnd = time + duration;
      getParamADSR(
        node.gain,
        attack,
        decay,
        sustain,
        release,
        0,
        0.3,
        time,
        holdEnd,
        "linear",
      );
      const envEnd = holdEnd + release + 0.01;
      const vibratoHandle = getVibratoOscillator(
        bufferSource.detune,
        value,
        time,
      );
      getPitchEnvelope(bufferSource.detune, value, time, holdEnd);
      bufferSource.stop(envEnd);
      const stop = () => {};
      onceEnded(bufferSource, () => {
        releaseAudioNode(bufferSource);
        vibratoHandle?.stop();
        onended();
      });
      return {
        node,
        stop,
        nodes: { source: [bufferSource], ...vibratoHandle?.nodes },
      };
    } catch (err) {
      lastErr = err;
      if (process.env.NODE_ENV === "development") {
        console.warn(`[beatober soundfont] ${font} failed`, err);
      }
    }
  }
  throw lastErr ?? new Error("All soundfont presets failed to decode");
}

/** FluidR3 presets decode more reliably in Chrome/Safari than some legacy SF2 exports. */
function preferFluidFonts(fonts) {
  const fluid = fonts.filter((f) => f.includes("FluidR3"));
  const rest = fonts.filter((f) => !f.includes("FluidR3"));
  return fluid.length ? [...fluid, ...rest] : fonts;
}

/** GM names people use on strudel.cc docs but upstream folds into `gm_piano` (commented in gm.mjs). */
const GM_ELECTRIC_GRAND_FONTS = preferFluidFonts([
  "0020_Aspirin_sf2_file",
  "0020_Chaos_sf2_file",
  "0020_FluidR3_GM_sf2_file",
  "0020_GeneralUserGS_sf2_file",
  "0020_JCLive_sf2_file",
  "0021_Aspirin_sf2_file",
  "0021_GeneralUserGS_sf2_file",
  "0022_Aspirin_sf2_file",
]);

function registerGmSound(name, fonts) {
  const ordered = preferFluidFonts(fonts);
  registerSound(
    name,
    (time, value, onended) => playGmPreset(time, value, onended, ordered),
    { type: "soundfont", prebake: true, fonts: ordered },
  );
}

export function registerSoundfonts() {
  Object.entries(gm).forEach(([name, fonts]) => {
    registerGmSound(name, fonts);
  });

  for (const name of ["gm_electric_grand", "gm_electric_grand_piano"]) {
    registerGmSound(name, GM_ELECTRIC_GRAND_FONTS);
  }
}
