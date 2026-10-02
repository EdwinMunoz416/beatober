import { getSql, dbConfigured } from "@/lib/db";
import {
  expandIdentityPool,
  loadIdentityPool,
  getUsedVisitorSlots,
} from "@/lib/identity-pool-db";
import { pickAvailableIdentity } from "@/lib/identity-pool-core";

export type StoredVisitorIdentity = {
  nickname: string;
  showTitle: string;
  avatarUrl: string | null;
  characterId: string | null;
};

const MAX_ASSIGN_ATTEMPTS = 12;

export async function ensureVisitorIdentity(
  visitorId: string | undefined | null,
): Promise<void> {
  if (!visitorId?.trim() || !dbConfigured()) return;

  const id = visitorId.trim().slice(0, 64);
  const sql = getSql();

  const existing = await sql`
    SELECT visitor_id FROM visitor_nicknames WHERE visitor_id = ${id} LIMIT 1
  `;
  if (existing.length > 0) return;

  for (let attempt = 0; attempt < MAX_ASSIGN_ATTEMPTS; attempt++) {
    const { usedChars, usedNames } = await getUsedVisitorSlots(sql);
    let pool = await loadIdentityPool(sql);
    let entry = pickAvailableIdentity(pool, usedChars, usedNames);

    if (!entry) {
      await expandIdentityPool(sql, { minFree: 10, targetNew: 25, maxJikanPages: 6 });
      pool = await loadIdentityPool(sql);
      entry = pickAvailableIdentity(pool, usedChars, usedNames);
    }

    if (!entry) {
      console.warn("[visitor-identity] Pool exhausted — no character for", id);
      return;
    }

    try {
      const inserted = await sql`
        INSERT INTO visitor_nicknames (
          visitor_id,
          nickname,
          show_title,
          avatar_url,
          character_id
        )
        VALUES (
          ${id},
          ${entry.name},
          ${entry.seriesTitle},
          ${entry.imageUrl},
          ${entry.characterId}
        )
        ON CONFLICT (visitor_id) DO NOTHING
        RETURNING visitor_id
      `;

      if (inserted.length > 0) return;

      const stillNew = await sql`
        SELECT visitor_id FROM visitor_nicknames WHERE visitor_id = ${id} LIMIT 1
      `;
      if (stillNew.length > 0) return;
    } catch {
      /* unique character_id / nickname race — try next slot */
    }

    usedChars.add(entry.characterId);
    usedNames.add(entry.name.trim().toLowerCase());
  }
}

export function resolveDisplayIdentity(row: {
  nickname: string | null;
  show_title: string | null;
  avatar_url: string | null;
  character_id: string | null;
}): {
  nickname: string;
  showTitle: string;
  avatarUrl: string | null;
} {
  const nick = row.nickname?.trim();
  return {
    nickname: nick || "Guest",
    showTitle: row.show_title?.trim() || "Studio",
    avatarUrl: row.avatar_url?.trim() || null,
  };
}
