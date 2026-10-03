#!/usr/bin/env node
/**
 * superdough caches rejected decodeAudioData promises forever — patch once per install.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, "node_modules/superdough/sampler.mjs");

if (!fs.existsSync(target)) {
  console.warn("[patch-superdough-decode] superdough not installed, skip");
  process.exit(0);
}

const MARK = "beatober-decode-cache-bust";
let src = fs.readFileSync(target, "utf8");
if (src.includes(MARK)) {
  process.exit(0);
}

const needle = `        const decoded = await ac.decodeAudioData(res);
        bufferCache[url] = decoded;
        return decoded;
      });`;

const replacement = `        try {
          const decoded = await ac.decodeAudioData(res.slice(0));
          bufferCache[url] = decoded;
          return decoded;
        } catch (err) {
          delete loadCache[url];
          delete bufferCache[url];
          throw err;
        }
      }).catch((err) => {
        delete loadCache[url];
        delete bufferCache[url];
        throw err;
      }); /* ${MARK} */`;

if (!src.includes(needle)) {
  console.warn(
    "[patch-superdough-decode] sampler.mjs layout changed — patch not applied",
  );
  process.exit(0);
}

src = src.replace(needle, replacement);
fs.writeFileSync(target, src);
console.log("[patch-superdough-decode] patched superdough/sampler.mjs");
