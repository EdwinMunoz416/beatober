declare module "@strudel/web" {
  export function initStrudel(
    options?: Record<string, unknown>,
  ): Promise<unknown>;
  export function evaluate(code: string, autoplay?: boolean): Promise<unknown>;
  export function hush(): void;
  export function evalScope(
    ...modules: Array<Promise<unknown> | Record<string, unknown>>
  ): Promise<unknown>;
  export function getTime(): number;
  export function getAudioContext(): AudioContext;
  export function reify(p: unknown): unknown;
  export const controls: { speed: unknown; shape: unknown };
}

declare module "@strudel/webaudio" {
  export function samples(url: string): Promise<unknown>;
  export function registerSynthSounds(): Promise<unknown>;
  export function registerZZFXSounds(): Promise<unknown>;
  export function aliasBank(url: string): Promise<unknown>;
}

declare module "@strudel/soundfonts" {
  export function registerSoundfonts(): Promise<unknown>;
}

declare module "@strudel/draw" {
  export function getDrawContext(
    id?: string,
    opts?: Record<string, unknown>,
  ): CanvasRenderingContext2D | WebGLRenderingContext;
}

declare module "@strudel/tonal";

declare module "hydra-synth" {
  const Hydra: new (opts: Record<string, unknown>) => unknown;
  export default Hydra;
}
