export type IdentityPoolEntry = {
  characterId: string;
  malCharacterId: number | null;
  name: string;
  seriesKey: string;
  seriesTitle: string;
  imageUrl: string;
};

export function normalizeNicknameKey(nickname: string): string {
  return nickname.trim().toLowerCase();
}

export function pickAvailableIdentity(
  pool: readonly IdentityPoolEntry[],
  usedCharacterIds: ReadonlySet<string>,
  usedNicknames: ReadonlySet<string> = new Set(),
): IdentityPoolEntry | null {
  for (const entry of pool) {
    if (usedCharacterIds.has(entry.characterId)) continue;
    if (usedNicknames.has(normalizeNicknameKey(entry.name))) continue;
    return entry;
  }
  return null;
}

export function findPoolEntryByCharacterId(
  pool: readonly IdentityPoolEntry[],
  characterId: string,
): IdentityPoolEntry | null {
  return pool.find((e) => e.characterId === characterId) ?? null;
}

export function countAssignableFree(
  pool: readonly IdentityPoolEntry[],
  usedChars: ReadonlySet<string>,
  usedNames: ReadonlySet<string>,
): number {
  let n = 0;
  for (const entry of pool) {
    if (usedChars.has(entry.characterId)) continue;
    if (usedNames.has(normalizeNicknameKey(entry.name))) continue;
    n += 1;
  }
  return n;
}
