import {
  loadAllPatterns,
  loadManifest,
  loadPattern,
  type DayEntry,
  type Manifest,
} from "@/lib/content";
import { dbConfigured, getSql } from "@/lib/db";

type DbRow = {
  day: number;
  approved: boolean;
  title: string | null;
  strudel_file: string;
  audio_url: string | null;
  pattern: string | null;
};

function rowToEntry(row: DbRow): DayEntry {
  return {
    day: row.day,
    approved: row.approved,
    title: row.title ?? `Day ${row.day}`,
    strudelFile: row.strudel_file,
    audioUrl: row.audio_url ?? undefined,
  };
}

async function loadFromDb(manifest: Manifest): Promise<{
  days: DayEntry[];
  patterns: Record<number, string>;
} | null> {
  if (!dbConfigured()) return null;
  try {
  const sql = getSql();
  const rows = (await sql`
    SELECT day, approved, title, strudel_file, audio_url, pattern
    FROM beatober_days
    ORDER BY day
  `) as DbRow[];

  if (rows.length === 0) return null;

  const days: DayEntry[] = [];
  const patterns: Record<number, string> = {};
  const filePatterns = loadAllPatterns(manifest);

  for (const row of rows) {
    const entry = rowToEntry(row);
    days.push(entry);
    patterns[entry.day] =
      row.pattern?.trim() ||
      filePatterns[entry.day] ||
      loadPattern(entry.strudelFile);
  }

  return { days, patterns };
  } catch {
    return null;
  }
}

export async function loadBeatoberState(): Promise<{
  manifest: Manifest;
  patterns: Record<number, string>;
}> {
  const manifest = loadManifest();
  const fromDb = await loadFromDb(manifest);
  if (fromDb) {
    return {
      manifest: { ...manifest, days: fromDb.days },
      patterns: fromDb.patterns,
    };
  }
  return { manifest, patterns: loadAllPatterns(manifest) };
}

/** File fallback if Neon is unreachable (avoids 500 on /day/N). */
export async function loadBeatoberStateSafe(): Promise<{
  manifest: Manifest;
  patterns: Record<number, string>;
}> {
  try {
    return await loadBeatoberState();
  } catch {
    const manifest = loadManifest();
    return { manifest, patterns: loadAllPatterns(manifest) };
  }
}

export async function upsertDay(
  day: number,
  patch: Partial<{
    approved: boolean;
    audioUrl: string;
    pattern: string;
    title: string;
  }>,
): Promise<void> {
  if (!dbConfigured()) {
    throw new Error("DATABASE_URL not configured");
  }
  const sql = getSql();
  const pad = String(day).padStart(2, "0");
  const manifest = loadManifest();
  const base = manifest.days.find((d) => d.day === day);

  const existing = (await sql`
    SELECT day, approved, title, strudel_file, audio_url, pattern
    FROM beatober_days WHERE day = ${day}
  `) as DbRow[];

  const row = existing[0];
  const strudelFile = row?.strudel_file ?? base?.strudelFile ?? `${pad}.strudel`;
  const approved =
    patch.approved !== undefined ? patch.approved : (row?.approved ?? base?.approved ?? false);
  const title = patch.title ?? row?.title ?? base?.title ?? `Day ${day}`;
  const audioUrl =
    patch.audioUrl !== undefined
      ? patch.audioUrl
      : (row?.audio_url ?? base?.audioUrl ?? null);
  const pattern =
    patch.pattern !== undefined
      ? patch.pattern
      : (row?.pattern ??
        (() => {
          try {
            return loadPattern(strudelFile);
          } catch {
            return null;
          }
        })());

  await sql`
    INSERT INTO beatober_days (day, approved, title, strudel_file, audio_url, pattern)
    VALUES (${day}, ${approved}, ${title}, ${strudelFile}, ${audioUrl}, ${pattern})
    ON CONFLICT (day) DO UPDATE SET
      approved = EXCLUDED.approved,
      title = EXCLUDED.title,
      strudel_file = EXCLUDED.strudel_file,
      audio_url = EXCLUDED.audio_url,
      pattern = EXCLUDED.pattern,
      updated_at = now()
  `;
}
