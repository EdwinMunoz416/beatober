/** Jikan v4 fetch helpers — used by sync, expand, and runtime (Node). */
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
];

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function normalizeNicknameKey(nickname) {
  return nickname.trim().toLowerCase();
}

function imageUrl(char) {
  const jpg = char?.images?.jpg;
  return jpg?.image_url ?? jpg?.small_image_url ?? null;
}

export async function jikanGet(pathname, attempt = 0) {
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

export async function fetchAnimeCharacterPage(malAnimeId, page) {
  const json = await jikanGet(
    `/anime/${malAnimeId}/characters?page=${page}`,
  );
  const roster = [];
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
  return {
    roster,
    hasNext: Boolean(json.pagination?.has_next_page),
  };
}
