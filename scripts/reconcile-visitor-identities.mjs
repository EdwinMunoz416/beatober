#!/usr/bin/env node
import {
  expandIdentityPool,
  findPoolEntryByCharacterId,
  loadIdentityPool,
  normalizeNicknameKey,
  pickAvailableIdentity,
} from "./identity-pool.mjs";

/**
 * Ensure every visitor_nicknames row has unique character_id, unique nickname
 * (case-insensitive), and avatar_url from the pool. Rows that already qualify
 * (by assigned_at order) keep their slot; duplicates and gaps are re-pooled.
 */
export async function reconcileVisitorIdentities(sql) {
  const rows = await sql`
    SELECT visitor_id, nickname, show_title, avatar_url, character_id, assigned_at
    FROM visitor_nicknames
    ORDER BY assigned_at ASC NULLS LAST, visitor_id ASC
  `;

  if (rows.length === 0) return;

  await expandIdentityPool(sql, { minFree: 15, targetNew: 40 });

  let pool = await loadIdentityPool(sql);
  const usedCharacterIds = new Set();
  const usedNicknames = new Set();
  /** @type {Map<string, { nickname: string, showTitle: string, avatarUrl: string, characterId: string }>} */
  const planned = new Map();

  for (const row of rows) {
    const visitorId = row.visitor_id;
    const nickKey = normalizeNicknameKey(row.nickname ?? "");
    const charId = row.character_id?.trim() || null;
    const avatar = row.avatar_url?.trim() || null;
    const poolByChar = charId ? findPoolEntryByCharacterId(pool, charId) : null;

    const charFree = charId && poolByChar && !usedCharacterIds.has(charId);
    const nameFree = nickKey && !usedNicknames.has(nickKey);
    const avatarOk = Boolean(avatar || poolByChar?.imageUrl);

    if (charFree && nameFree && poolByChar && avatarOk) {
      usedCharacterIds.add(charId);
      usedNicknames.add(nickKey);
      planned.set(visitorId, {
        nickname: row.nickname.trim(),
        showTitle: row.show_title?.trim() || poolByChar.seriesTitle,
        avatarUrl: avatar || poolByChar.imageUrl,
        characterId: charId,
      });
      continue;
    }

    let entry = pickAvailableIdentity(pool, usedCharacterIds, usedNicknames);
    if (!entry) {
      await expandIdentityPool(sql, { minFree: 30, targetNew: 60 });
      pool = await loadIdentityPool(sql);
      entry = pickAvailableIdentity(pool, usedCharacterIds, usedNicknames);
    }
    if (!entry) {
      throw new Error(
        `[reconcile-visitor-identities] Pool exhausted — cannot assign ${visitorId} (${rows.length} rows). Run npm run db:expand-pool when Jikan is reachable.`,
      );
    }

    usedCharacterIds.add(entry.characterId);
    usedNicknames.add(normalizeNicknameKey(entry.name));

    planned.set(visitorId, {
      nickname: entry.name,
      showTitle: entry.seriesTitle,
      avatarUrl: entry.imageUrl,
      characterId: entry.characterId,
    });
  }

  await sql`
    UPDATE visitor_nicknames
    SET character_id = NULL
    WHERE character_id IS NOT NULL
  `;

  let changed = 0;
  for (const row of rows) {
    const fin = planned.get(row.visitor_id);
    if (!fin) continue;

    const same =
      row.character_id === fin.characterId &&
      normalizeNicknameKey(row.nickname ?? "") ===
        normalizeNicknameKey(fin.nickname) &&
      (row.avatar_url?.trim() || "") === fin.avatarUrl &&
      (row.show_title?.trim() || "") === fin.showTitle;

    await sql`
      UPDATE visitor_nicknames
      SET
        nickname = ${fin.nickname},
        show_title = ${fin.showTitle},
        avatar_url = ${fin.avatarUrl},
        character_id = ${fin.characterId}
      WHERE visitor_id = ${row.visitor_id}
    `;
    if (!same) changed += 1;
  }

  const dupes = await sql`
    SELECT lower(btrim(nickname)) AS k, COUNT(*)::int AS n
    FROM visitor_nicknames
    GROUP BY 1
    HAVING COUNT(*) > 1
  `;
  const gaps = await sql`
    SELECT visitor_id
    FROM visitor_nicknames
    WHERE character_id IS NULL
       OR avatar_url IS NULL
       OR btrim(avatar_url) = ''
       OR btrim(nickname) = ''
  `;

  if (dupes.length > 0 || gaps.length > 0) {
    throw new Error(
      `[reconcile-visitor-identities] Still invalid after reconcile: ${dupes.length} duplicate nicknames, ${gaps.length} incomplete rows.`,
    );
  }

  console.log(
    `[db-migrate] reconcile: ${rows.length} rows, ${changed} updated (${usedCharacterIds.size} unique characters).`,
  );
}
