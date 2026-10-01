import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const strudelWebEntry = path.join(rootDir, "node_modules/@strudel/web/web.mjs");

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
    "@strudel/codemirror",
    "hydra-synth",
  ],
  turbopack: {
    resolveAlias: {
      "@strudel/web": "./node_modules/@strudel/web/web.mjs",
    },
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "@strudel/web": strudelWebEntry,
      };
    }
    return config;
  },
};

export default nextConfig;
