import { getSql } from "@/lib/db";
import {
  countAssignableFree,
  normalizeNicknameKey,
  type IdentityPoolEntry,
} from "@/lib/identity-pool-core";
import {
  fetchAnimeCharacterPage,
  IDENTITY_SHOWS,
  sleep,
} from "@/lib/identity-pool-jikan";

type Sql = ReturnType<typeof getSql>;

function rowToEntry(r: {
  character_id: string;
  name: string;
  series_key: string;
  series_title: string;
  image_url: string;
  mal_character_id: number | null;
}): IdentityPoolEntry {
  return {
    characterId: r.character_id,
    malCharacterId: r.mal_character_id,
    name: r.name,
    seriesKey: r.series_key,
    seriesTitle: r.series_title,
    imageUrl: r.image_url,
  };
}

export async function loadIdentityPool(sql: Sql): Promise<IdentityPoolEntry[]> {
  const rows = await sql`
    SELECT character_id, name, series_key, series_title, image_url, mal_character_id
    FROM identity_pool
    ORDER BY sort_order ASC
  `;
  return (rows as Parameters<typeof rowToEntry>[0][]).map(rowToEntry);
}

export async function getUsedVisitorSlots(sql: Sql) {
  const usedRows = await sql`
    SELECT character_id, nickname FROM visitor_nicknames
  `;
  const usedChars = new Set<string>();
  const usedNames = new Set<string>();
  for (const r of usedRows as {
    character_id: string | null;
    nickname: string;
  }[]) {
    if (r.character_id) usedChars.add(r.character_id);
    if (r.nickname?.trim()) {
      usedNames.add(normalizeNicknameKey(r.nickname));
    }
  }
  return { usedChars, usedNames };
}

async function nextSortOrder(sql: Sql): Promise<number> {
  const rows = await sql`
    SELECT COALESCE(MAX(sort_order), 0)::int AS m FROM identity_pool
  `;
  return ((rows[0] as { m: number })?.m ?? 0) + 1;
}

async function getPoolNameKeys(sql: Sql): Promise<Set<string>> {
  const rows = await sql`SELECT lower(btrim(name)) AS k FROM identity_pool`;
  return new Set((rows as { k: string }[]).map((r) => r.k));
}

async function getPoolIdSet(sql: Sql): Promise<Set<string>> {
  const rows = await sql`SELECT character_id FROM identity_pool`;
  return new Set((rows as { character_id: string }[]).map((r) => r.character_id));
}

async function getFetchPage(sql: Sql, seriesKey: string): Promise<number> {
  const rows = await sql`
    SELECT next_page FROM identity_pool_fetch_state WHERE series_key = ${seriesKey}
  `;
  return (rows[0] as { next_page: number } | undefined)?.next_page ?? 1;
}

async function setFetchPage(sql: Sql, seriesKey: string, nextPage: number) {
  await sql`
    INSERT INTO identity_pool_fetch_state (series_key, next_page)
    VALUES (${seriesKey}, ${nextPage})
    ON CONFLICT (series_key) DO UPDATE SET next_page = EXCLUDED.next_page
  `;
}

const EXPAND_MAX_MS = 12_000;

/** Grow Neon pool via Jikan when free slots drop below minFree (no redeploy). */
export async function expandIdentityPool(
  sql: Sql,
  { minFree = 15, targetNew = 30, maxJikanPages = 8 } = {},
): Promise<{ added: number; free: number }> {
  const started = Date.now();
  const pool = await loadIdentityPool(sql);
  const { usedChars, usedNames } = await getUsedVisitorSlots(sql);
  let free = countAssignableFree(pool, usedChars, usedNames);
  if (free >= minFree) return { added: 0, free };

  const existingIds = await getPoolIdSet(sql);
  const existingNames = await getPoolNameKeys(sql);
  let sortOrder = await nextSortOrder(sql);
  let added = 0;
  let pagesUsed = 0;
  let showIdx = 0;

  while (
    free + added < minFree &&
    added < targetNew &&
    pagesUsed < maxJikanPages &&
    Date.now() - started < EXPAND_MAX_MS
  ) {
    const show = IDENTITY_SHOWS[showIdx % IDENTITY_SHOWS.length]!;
    showIdx += 1;
    pagesUsed += 1;

    const page = await getFetchPage(sql, show.key);
    let batch;
    try {
      batch = await fetchAnimeCharacterPage(show.malAnimeId, page);
      await sleep(900);
    } catch {
      continue;
    }

    await setFetchPage(sql, show.key, page + 1);

    for (const char of batch.roster) {
      if (existingIds.has(char.characterId)) continue;
      const nameKey = normalizeNicknameKey(char.name);
      if (existingNames.has(nameKey) || usedNames.has(nameKey)) continue;

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
  return { added, free };
}
