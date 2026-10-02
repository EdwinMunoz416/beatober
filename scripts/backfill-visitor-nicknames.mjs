#!/usr/bin/env node
import {
  expandIdentityPool,
  loadIdentityPool,
  normalizeNicknameKey,
  pickAvailableIdentity,
} from "./identity-pool.mjs";

/** Create locked identity rows for analytics visitor_ids not yet in visitor_nicknames. */
export async function backfillVisitorNicknames(sql) {
  const usedRows = await sql`
    SELECT character_id, nickname FROM visitor_nicknames
  `;
  const usedChars = new Set();
  const usedNames = new Set();
  for (const r of usedRows) {
    if (r.character_id) usedChars.add(r.character_id);
    if (r.nickname?.trim()) usedNames.add(normalizeNicknameKey(r.nickname));
  }

  const rows = await sql`
    SELECT DISTINCT e.visitor_id
    FROM analytics_events e
    WHERE e.visitor_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM visitor_nicknames v WHERE v.visitor_id = e.visitor_id
      )
  `;

  if (rows.length === 0) return;

  await expandIdentityPool(sql, {
    minFree: Math.max(15, rows.length + 5),
    targetNew: 40,
  });

  let pool = await loadIdentityPool(sql);
  let inserted = 0;
  for (const row of rows) {
    let entry = pickAvailableIdentity(pool, usedChars, usedNames);
    if (!entry) {
      await expandIdentityPool(sql, { minFree: 20, targetNew: 40 });
      pool = await loadIdentityPool(sql);
      entry = pickAvailableIdentity(pool, usedChars, usedNames);
    }
    if (!entry) break;

    const result = await sql`
      INSERT INTO visitor_nicknames (
        visitor_id,
        nickname,
        show_title,
        avatar_url,
        character_id
      )
      VALUES (
        ${row.visitor_id},
        ${entry.name},
        ${entry.seriesTitle},
        ${entry.imageUrl},
        ${entry.characterId}
      )
      ON CONFLICT (visitor_id) DO NOTHING
      RETURNING visitor_id
    `;

    if (result.length > 0) {
      usedChars.add(entry.characterId);
      usedNames.add(normalizeNicknameKey(entry.name));
      inserted += 1;
    }
  }

  console.log(
    `[db-migrate] visitor_nicknames: ${inserted} new identities from pool (${rows.length} analytics ids missing rows).`,
  );
}
