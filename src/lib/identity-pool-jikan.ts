/** Jikan v4 — server-only (assignment expand, not admin page render). */

export const JIKAN = "https://api.jikan.moe/v4";

export const IDENTITY_SHOWS = [
  { key: "naruto", title: "Naruto", malAnimeId: 20 },
  { key: "jjk", title: "Jujutsu Kaisen", malAnimeId: 40748 },
  { key: "dbz", title: "Dragon Ball Z", malAnimeId: 813 },
  { key: "one-piece", title: "One Piece", malAnimeId: 21 },
  { key: "evangelion", title: "Neon Genesis Evangelion", malAnimeId: 30 },
  { key: "mha", title: "My Hero Academia", malAnimeId: 31964 },
  {
    key: "seven-deadly-sins",
    title: "The Seven Deadly Sins",
    malAnimeId: 23755,
  },
  { key: "aot", title: "Attack on Titan", malAnimeId: 16498 },
] as const;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function imageUrl(char: {
  images?: { jpg?: { image_url?: string; small_image_url?: string } };
}): string | null {
  const jpg = char?.images?.jpg;
  return jpg?.image_url ?? jpg?.small_image_url ?? null;
}

async function jikanGet(pathname: string, attempt = 0): Promise<unknown> {
  const res = await fetch(`${JIKAN}${pathname}`, {
    headers: { Accept: "application/json" },
  });
  if (res.status === 429 || res.status === 504) {
    if (attempt >= 4) throw new Error(`Jikan ${res.status} after retries`);
    await sleep(1500 + attempt * 2500);
    return jikanGet(pathname, attempt + 1);
  }
  if (!res.ok) throw new Error(`Jikan HTTP ${res.status}`);
  return res.json();
}

export async function fetchAnimeCharacterPage(malAnimeId: number, page: number) {
  const json = (await jikanGet(
    `/anime/${malAnimeId}/characters?page=${page}`,
  )) as {
    data?: {
      character?: { mal_id?: number; name?: string; images?: unknown };
      role?: string;
    }[];
    pagination?: { has_next_page?: boolean };
  };

  const roster: {
    characterId: string;
    malCharacterId: number;
    name: string;
    imageUrl: string;
  }[] = [];

  for (const row of json.data ?? []) {
    const c = row.character;
    if (!c?.mal_id || !c.name) continue;
    const url = imageUrl(c as Parameters<typeof imageUrl>[0]);
    if (!url) continue;
    roster.push({
      characterId: `mal:${c.mal_id}`,
      malCharacterId: c.mal_id,
      name: c.name,
      imageUrl: url,
    });
  }

  return {
    roster,
    hasNext: Boolean(json.pagination?.has_next_page),
  };
}

export { sleep };
