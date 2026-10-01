/**
 * Turbopack cannot resolve Strudel's Vite-style SharedWorker URL.
 * Run from beatober/ via postinstall. Idempotent.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const targets = [
  "node_modules/@strudel/core/dist/index.mjs",
  "node_modules/@strudel/web/dist/index.mjs",
];

const pattern =
  /new SharedWorker\(new URL\(\s*\/\* @vite-ignore \*\/\s*"" \+ new URL\("assets\/(clockworker-[^"]+\.js)", import\.meta\.url\)\.href,\s*import\.meta\.url\s*\)\)/g;

let changed = 0;
for (const rel of targets) {
  const abs = join(root, rel);
  if (!existsSync(abs)) continue;
  const before = readFileSync(abs, "utf8");
  if (!before.includes('"" + new URL("assets/clockworker-')) continue;
  const after = before.replace(
    pattern,
    (_m, file) =>
      `new SharedWorker(new URL("./assets/${file}", import.meta.url))`,
  );
  if (after !== before) {
    writeFileSync(abs, after);
    changed += 1;
  }
}

if (changed > 0) {
  console.log(`[patch-strudel-clockworker] patched ${changed} file(s)`);
}
