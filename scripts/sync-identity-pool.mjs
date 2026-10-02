#!/usr/bin/env node
/**
 * Build src/data/visitor-identity-pool.json from Jikan v4 (MAL).
 * Only characters with jpg/webp images. Interleaved across eight series.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.join(ROOT, "src/data/visitor-identity-pool.json");
const LEGACY = path.join(ROOT, "src/data/anime-visitor-names.json");

const JIKAN = "https://api.jikan.moe/v4";
const CHARS_PER_SHOW = 30;

const SHOWS = [
  { key: "naruto", title: "Naruto", malAnimeId: 20 },
  { key: "jjk", title: "Jujutsu Kaisen", malAnimeId: 40748 },
  { key: "dbz", title: "Dragon Ball Z", malAnimeId: 813 },
  { key: "one-piece", title: "One Piece", malAnimeId: 21 },
  { key: "evangelion", title: "Neon Genesis Evangelion", malAnimeId: 30 },
  { key: "mha", title: "My Hero Academia", malAnimeId: 31964 },
  { key: "seven-deadly-sins", title: "The Seven Deadly Sins", malAnimeId: 23755 },
  { key: "aot", title: "Attack on Titan", malAnimeId: 16498 },
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeName(name) {
  return name.trim().toLowerCase();
}

function slug(name) {
  return normalizeName(name).replace(/[^a-z0-9]+/g, "-");
}

function imageUrl(char) {
  const jpg = char?.images?.jpg;
  return jpg?.image_url ?? jpg?.small_image_url ?? null;
}

async function jikanGet(pathname, attempt = 0) {
  const res = await fetch(`${JIKAN}${pathname}`, {
    headers: { Accept: "application/json" },
  });
  if (res.status === 429 || res.status === 504) {
    if (attempt >= 5) throw new Error(`Jikan ${res.status} after retries`);
    await sleep(2000 + attempt * 3000);
    return jikanGet(pathname, attempt + 1);
  }
  if (!res.ok) throw new Error(`Jikan HTTP ${res.status}`);
  return res.json();
}

async function fetchAnimeCharacters(malAnimeId) {
  const roster = [];
  let page = 1;
  let hasNext = true;

  while (hasNext && page <= 3) {
    const json = await jikanGet(
      `/anime/${malAnimeId}/characters?page=${page}`,
    );
    for (const row of json.data ?? []) {
      const c = row.character;
      if (!c?.mal_id || !c.name) continue;
      const url = imageUrl(c);
      if (!url) continue;
      roster.push({
        characterId: `mal:${c.mal_id}`,
        malCharacterId: c.mal_id,
        name: c.name,
        role: row.role ?? "",
        imageUrl: url,
      });
    }
    hasNext = Boolean(json.pagination?.has_next_page);
    page += 1;
    if (hasNext) await sleep(1200);
  }

  await sleep(1200);
  return roster;
}

function sortRoster(roster) {
  const order = { Main: 0, Supporting: 1 };
  return [...roster].sort((a, b) => {
    const ra = order[a.role] ?? 2;
    const rb = order[b.role] ?? 2;
    if (ra !== rb) return ra - rb;
    return a.name.localeCompare(b.name);
  });
}

function loadLegacyImages() {
  try {
    const data = JSON.parse(fs.readFileSync(LEGACY, "utf8"));
    const map = new Map();
    for (const show of data.shows ?? []) {
      for (const c of show.characters ?? []) {
        const name = typeof c === "string" ? c : c.name;
        const url = typeof c === "string" ? null : c.imageMedium;
        if (name && url) map.set(`${show.key}:${normalizeName(name)}`, url);
      }
    }
    return map;
  } catch {
    return new Map();
  }
}

function interleavePools(byShow) {
  const maxLen = Math.max(...byShow.map((s) => s.entries.length), 0);
  const pool = [];
  const seenIds = new Set();

  for (let i = 0; i < maxLen; i++) {
    for (const show of byShow) {
      const entry = show.entries[i];
      if (!entry || seenIds.has(entry.characterId)) continue;
      seenIds.add(entry.characterId);
      pool.push({
        characterId: entry.characterId,
        malCharacterId: entry.malCharacterId ?? null,
        name: entry.name,
        seriesKey: show.key,
        seriesTitle: show.title,
        imageUrl: entry.imageUrl,
      });
    }
  }
  return pool;
}

async function main() {
  const legacyImages = loadLegacyImages();
  const byShow = [];

  for (const show of SHOWS) {
    let entries = [];
    try {
      const roster = sortRoster(await fetchAnimeCharacters(show.malAnimeId));
      entries = roster.slice(0, CHARS_PER_SHOW);
      console.log(
        `  ✓ ${show.title}: ${roster.length} with images → ${entries.length} in show bucket`,
      );
    } catch (err) {
      console.warn(
        `  ⚠ ${show.title}: ${err instanceof Error ? err.message : err}`,
      );
    }

    if (entries.length === 0) {
      for (const [key, url] of legacyImages) {
        if (!key.startsWith(`${show.key}:`)) continue;
        const namePart = key.slice(show.key.length + 1);
        const displayName = namePart.replace(/-/g, " ");
        entries.push({
          characterId: `legacy:${show.key}:${slug(displayName)}`,
          malCharacterId: null,
          name: displayName.replace(/\b\w/g, (c) => c.toUpperCase()),
          imageUrl: url,
        });
      }
      entries = entries.slice(0, CHARS_PER_SHOW);
      console.log(`  ~ ${show.title}: ${entries.length} from legacy JSON fallback`);
    }

    byShow.push({ ...show, entries });
  }

  const pool = interleavePools(byShow);
  const payload = {
    version: 1,
    source: "Jikan v4 (https://api.jikan.moe)",
    syncedAt: new Date().toISOString(),
    allocation: "first-free character_id in pool order (unique globally)",
    pool,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(
    `[sync-identity-pool] Wrote ${pool.length} assignable identities → ${OUT}`,
  );

  const dbUrl =
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.POSTGRES_PRISMA_URL;
  if (dbUrl) {
    const { neon } = await import("@neondatabase/serverless");
    const { upsertPoolEntries } = await import("./identity-pool-db.mjs");
    const sql = neon(dbUrl);
    const added = await upsertPoolEntries(sql, pool);
    console.log(`[sync-identity-pool] Neon identity_pool +${added} new entries.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
