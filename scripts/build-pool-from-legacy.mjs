#!/usr/bin/env node
/** One-off: visitor-identity-pool.json from anime-visitor-names.json when Jikan is down. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const LEGACY = path.join(ROOT, "src/data/anime-visitor-names.json");
const OUT = path.join(ROOT, "src/data/visitor-identity-pool.json");

function slug(s) {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

const data = JSON.parse(fs.readFileSync(LEGACY, "utf8"));
const maxLen = Math.max(...data.shows.map((s) => s.characters.length));
const pool = [];
const seen = new Set();

for (let i = 0; i < maxLen; i++) {
  for (const show of data.shows) {
    const c = show.characters[i];
    if (!c) continue;
    const name = typeof c === "string" ? c : c.name;
    const imageUrl = typeof c === "string" ? null : c.imageMedium;
    if (!imageUrl) continue;
    const characterId = `legacy:${show.key}:${slug(name)}`;
    if (seen.has(characterId)) continue;
    seen.add(characterId);
    pool.push({
      characterId,
      malCharacterId: null,
      name,
      seriesKey: show.key,
      seriesTitle: show.title,
      imageUrl,
    });
  }
}

fs.writeFileSync(
  OUT,
  `${JSON.stringify(
    {
      version: 1,
      source: "legacy anime-visitor-names.json (images only)",
      syncedAt: new Date().toISOString(),
      allocation: "first-free character_id in pool order (unique globally)",
      pool,
    },
    null,
    2,
  )}\n`,
);
console.log(`[build-pool-from-legacy] ${pool.length} entries → ${OUT}`);
