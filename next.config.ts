import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@strudel/web",
    "@strudel/core",
    "@strudel/mini",
    "@strudel/transpiler",
    "@strudel/webaudio",
    "@strudel/tonal",
    "@strudel/draw",
    "@strudel/hydra",
    "@strudel/soundfonts",
    "hydra-synth",
  ],
};

export default nextConfig;
