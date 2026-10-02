import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  IDENTITY_SHOWS,
  fetchAnimeCharacterPage,
  normalizeNicknameKey,
  sleep,
} from "./identity-pool-jikan.mjs";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const POOL_JSON = path.join(ROOT, "src/data/visitor-identity-pool.json");

export { normalizeNicknameKey };

export function pickAvailableIdentity(pool, usedCharacterIds, usedNicknames = new Set()) {
  const chars =
    usedCharacterIds instanceof Set
      ? usedCharacterIds
      : new Set(usedCharacterIds);
  const names =
    usedNicknames instanceof Set ? usedNicknames : new Set(usedNicknames);

  for (const entry of pool) {
    if (chars.has(entry.characterId)) continue;
    if (names.has(normalizeNicknameKey(entry.name))) continue;
    return entry;
  }
  return null;
}

export function findPoolEntryByCharacterId(pool, characterId) {
  return pool.find((e) => e.characterId === characterId) ?? null;
}

function rowToEntry(r) {
  return {
    characterId: r.character_id,
    malCharacterId: r.mal_character_id ?? null,
    name: r.name,
    seriesKey: r.series_key,
    seriesTitle: r.series_title,
    imageUrl: r.image_url,
  };
}

export async function ensureIdentityPoolSchema(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS identity_pool (
      character_id TEXT PRIMARY KEY,
      sort_order INTEGER NOT NULL UNIQUE,
      name TEXT NOT NULL,
      series_key TEXT NOT NULL,
      series_title TEXT NOT NULL,
      image_url TEXT NOT NULL,
      mal_character_id INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS identity_pool_sort_order_idx
    ON identity_pool (sort_order ASC)
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS identity_pool_fetch_state (
      series_key TEXT PRIMARY KEY,
      next_page INTEGER NOT NULL DEFAULT 1
    )
  `;
}

export async function loadIdentityPool(sql) {
  const rows = await sql`
    SELECT character_id, sort_order, name, series_key, series_title, image_url, mal_character_id
    FROM identity_pool
    ORDER BY sort_order ASC
  `;
  return rows.map(rowToEntry);
}

export async function getUsedVisitorSlots(sql) {
  const usedRows = await sql`
    SELECT character_id, nickname FROM visitor_nicknames
  `;
  const usedChars = new Set();
  const usedNames = new Set();
  for (const r of usedRows) {
    if (r.character_id) usedChars.add(r.character_id);
    if (r.nickname?.trim()) usedNames.add(normalizeNicknameKey(r.nickname));
  }
  return { usedChars, usedNames };
}

export function countAssignableFree(pool, usedChars, usedNames) {
  let n = 0;
  for (const entry of pool) {
    if (usedChars.has(entry.characterId)) continue;
    if (usedNames.has(normalizeNicknameKey(entry.name))) continue;
    n += 1;
  }
  return n;
}

async function nextSortOrder(sql) {
  const rows = await sql`
    SELECT COALESCE(MAX(sort_order), 0)::int AS m FROM identity_pool
  `;
  return (rows[0]?.m ?? 0) + 1;
}

export async function seedIdentityPoolFromJson(sql) {
  const countRows = await sql`SELECT COUNT(*)::int AS n FROM identity_pool`;
  if (countRows[0]?.n > 0) return 0;

  let pool = [];
  try {
    const raw = JSON.parse(fs.readFileSync(POOL_JSON, "utf8"));
    pool = raw.pool ?? [];
  } catch {
    return 0;
  }

  let order = 1;
  for (const e of pool) {
    await sql`
      INSERT INTO identity_pool (
        character_id, sort_order, name, series_key, series_title, image_url, mal_character_id
      )
      VALUES (
        ${e.characterId},
        ${order},
        ${e.name},
        ${e.seriesKey},
        ${e.seriesTitle},
        ${e.imageUrl},
        ${e.malCharacterId ?? null}
      )
      ON CONFLICT (character_id) DO NOTHING
    `;
    order += 1;
  }

  for (const show of IDENTITY_SHOWS) {
    await sql`
      INSERT INTO identity_pool_fetch_state (series_key, next_page)
      VALUES (${show.key}, 2)
      ON CONFLICT (series_key) DO NOTHING
    `;
  }

  return pool.length;
}

/** Rows assigned to visitors but missing from pool (legacy deploy) → insert so IDs stay valid. */
export async function syncAssignedCharactersIntoPool(sql) {
  const missing = await sql`
    SELECT vn.character_id, vn.nickname, vn.show_title, vn.avatar_url
    FROM visitor_nicknames vn
    WHERE vn.character_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM identity_pool p WHERE p.character_id = vn.character_id
      )
  `;
  if (missing.length === 0) return 0;

  let order = await nextSortOrder(sql);
  let n = 0;
  for (const row of missing) {
    const key = row.character_id.startsWith("legacy:")
      ? row.character_id.split(":")[1] ?? "unknown"
      : "mal";
    await sql`
      INSERT INTO identity_pool (
        character_id, sort_order, name, series_key, series_title, image_url, mal_character_id
      )
      VALUES (
        ${row.character_id},
        ${order},
        ${row.nickname},
        ${key},
        ${row.show_title ?? "Studio"},
        ${row.avatar_url ?? ""},
        NULL
      )
      ON CONFLICT (character_id) DO NOTHING
    `;
    order += 1;
    n += 1;
  }
  return n;
}

async function getPoolNameKeys(sql) {
  const rows = await sql`SELECT lower(btrim(name)) AS k FROM identity_pool`;
  return new Set(rows.map((r) => r.k));
}

async function getPoolIdSet(sql) {
  const rows = await sql`SELECT character_id FROM identity_pool`;
  return new Set(rows.map((r) => r.character_id));
}

async function getFetchPage(sql, seriesKey) {
  const rows = await sql`
    SELECT next_page FROM identity_pool_fetch_state WHERE series_key = ${seriesKey}
  `;
  return rows[0]?.next_page ?? 1;
}

async function setFetchPage(sql, seriesKey, nextPage) {
  await sql`
    INSERT INTO identity_pool_fetch_state (series_key, next_page)
    VALUES (${seriesKey}, ${nextPage})
    ON CONFLICT (series_key) DO UPDATE SET next_page = EXCLUDED.next_page
  `;
}

/**
 * Append new characters from Jikan (or stop when target met).
 * Does not require redeploy — run via migrate, db:expand-pool, or runtime assign.
 */
export async function expandIdentityPool(
  sql,
  { minFree = 15, targetNew = 40, maxJikanPages = 24 } = {},
) {
  const pool = await loadIdentityPool(sql);
  const { usedChars, usedNames } = await getUsedVisitorSlots(sql);
  let free = countAssignableFree(pool, usedChars, usedNames);
  if (free >= minFree) {
    return { added: 0, free, exhausted: false };
  }

  const existingIds = await getPoolIdSet(sql);
  const existingNames = await getPoolNameKeys(sql);
  let sortOrder = await nextSortOrder(sql);
  let added = 0;
  let pagesUsed = 0;
  let showIdx = 0;

  while (free + added < minFree && added < targetNew && pagesUsed < maxJikanPages) {
    const show = IDENTITY_SHOWS[showIdx % IDENTITY_SHOWS.length];
    showIdx += 1;
    pagesUsed += 1;

    let page = await getFetchPage(sql, show.key);
    let batch;
    try {
      batch = await fetchAnimeCharacterPage(show.malAnimeId, page);
      await sleep(1100);
    } catch (err) {
      console.warn(
        `[identity-pool] Jikan skip ${show.title} p${page}: ${err instanceof Error ? err.message : err}`,
      );
      continue;
    }

    await setFetchPage(sql, show.key, page + 1);

    if (batch.roster.length === 0 && !batch.hasNext) continue;

    for (const char of batch.roster) {
      if (existingIds.has(char.characterId)) continue;
      const nameKey = normalizeNicknameKey(char.name);
      if (existingNames.has(nameKey)) continue;
      if (usedNames.has(nameKey)) continue;

      await sql`
        INSERT INTO identity_pool (
          character_id, sort_order, name, series_key, series_title, image_url, mal_character_id
        )
        VALUES (
          ${char.characterId},
          ${sortOrder},
          ${char.name},
          ${show.key},
          ${show.title},
          ${char.imageUrl},
          ${char.malCharacterId}
        )
        ON CONFLICT (character_id) DO NOTHING
      `;

      existingIds.add(char.characterId);
      existingNames.add(nameKey);
      sortOrder += 1;
      added += 1;
      if (added >= targetNew || free + added >= minFree) break;
    }
  }

  const poolAfter = await loadIdentityPool(sql);
  free = countAssignableFree(poolAfter, usedChars, usedNames);
  const exhausted = free < minFree && added === 0;

  if (added > 0) {
    console.log(
      `[identity-pool] Expanded +${added} entries (${free} assignable free, ${poolAfter.length} total).`,
    );
  }

  return { added, free, exhausted };
}

export async function ensureIdentityPoolCapacity(sql, opts) {
  await ensureIdentityPoolSchema(sql);
  await seedIdentityPoolFromJson(sql);
  await syncAssignedCharactersIntoPool(sql);
  return expandIdentityPool(sql, opts);
}

/** Merge JSON/sync output into Neon without resetting sort_order on existing rows. */
export async function upsertPoolEntries(sql, entries) {
  await ensureIdentityPoolSchema(sql);
  let order = await nextSortOrder(sql);
  let added = 0;
  const names = await getPoolNameKeys(sql);
  const ids = await getPoolIdSet(sql);

  for (const e of entries) {
    if (ids.has(e.characterId)) continue;
    const nameKey = normalizeNicknameKey(e.name);
    if (names.has(nameKey)) continue;
    await sql`
      INSERT INTO identity_pool (
        character_id, sort_order, name, series_key, series_title, image_url, mal_character_id
      )
      VALUES (
        ${e.characterId},
        ${order},
        ${e.name},
        ${e.seriesKey},
        ${e.seriesTitle},
        ${e.imageUrl},
        ${e.malCharacterId ?? null}
      )
      ON CONFLICT (character_id) DO NOTHING
    `;
    ids.add(e.characterId);
    names.add(nameKey);
    order += 1;
    added += 1;
  }
  return added;
}
