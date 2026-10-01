import {
  loadAllPatterns,
  loadManifest,
  loadPattern,
  type DayEntry,
  type Manifest,
} from "@/lib/content";
import { dbConfigured, getSql } from "@/lib/db";
import { resolveShellViewDay } from "@/lib/resolve-shell-day";

type DbRow = {
  day: number;
  approved: boolean;
  title: string | null;
  strudel_file: string;
  audio_url: string | null;
  pattern: string | null;
};

function manifestTitle(manifest: Manifest, day: number): string | undefined {
  return manifest.days.find((d) => d.day === day)?.title;
}

function rowToEntry(row: DbRow, manifest: Manifest): DayEntry {
  const fromManifest = manifestTitle(manifest, row.day);
  return {
    day: row.day,
    approved: row.approved,
    title: fromManifest ?? row.title ?? `Day ${row.day}`,
    strudelFile: row.strudel_file,
    audioUrl: row.audio_url ?? undefined,
  };
}

function patternFromRow(row: DbRow, manifest: Manifest): string {
  const trimmed = row.pattern?.trim();
  if (trimmed) return trimmed;
  const entry = rowToEntry(row, manifest);
  return loadPattern(entry.strudelFile);
}

function patternForManifestDay(manifest: Manifest, day: number): string {
  const entry =
    manifest.days.find((d) => d.day === day) ??
    manifest.days[0] ?? {
      day,
      approved: false,
      strudelFile: `${String(day).padStart(2, "0")}.strudel`,
    };
  return loadPattern(entry.strudelFile);
}

async function loadDayRowsFromDb(): Promise<DbRow[] | null> {
  if (!dbConfigured()) return null;
  try {
    const sql = getSql();
    const rows = (await sql`
      SELECT day, approved, title, strudel_file, audio_url, pattern
      FROM beatober_days
      ORDER BY day
    `) as DbRow[];
    return rows.length === 0 ? null : rows;
  } catch {
    return null;
  }
}

async function loadDaysFromDb(manifest: Manifest): Promise<DayEntry[] | null> {
  const rows = await loadDayRowsFromDb();
  if (!rows) return null;
  return rows.map((row) => rowToEntry(row, manifest));
}

/** Public pattern text for one day (Neon → git file fallback). */
export async function loadPublicPatternForDay(day: number): Promise<string> {
  const manifest = loadManifest();
  if (day < 1 || day > 31) {
    throw new Error("Invalid day");
  }

  if (dbConfigured()) {
    try {
      const sql = getSql();
      const rows = (await sql`
        SELECT day, approved, title, strudel_file, audio_url, pattern
        FROM beatober_days
        WHERE day = ${day}
        LIMIT 1
      `) as DbRow[];
      const row = rows[0];
      if (row) return patternFromRow(row, manifest);
    } catch {
      /* fall through to file */
    }
  }

  return patternForManifestDay(manifest, day);
}

async function mergedManifest(): Promise<Manifest> {
  const manifest = loadManifest();
  const daysFromDb = await loadDaysFromDb(manifest);
  return daysFromDb ? { ...manifest, days: daysFromDb } : manifest;
}

export async function loadBeatoberStateForViewDay(viewDay: number): Promise<{
  manifest: Manifest;
  patterns: Record<number, string>;
}> {
  const manifest = await mergedManifest();
  const safeDay =
    viewDay >= 1 && viewDay <= 31
      ? viewDay
      : (manifest.days[0]?.day ?? 1);
  const pattern = await loadPublicPatternForDay(safeDay);
  return {
    manifest,
    patterns: { [safeDay]: pattern },
  };
}

/** Fast shell: calendar metadata + one pattern for the selected day. */
export async function loadBeatoberShellState(
  now: Date,
  canPublish: boolean,
  initialSelectedDay?: number,
): Promise<{
  manifest: Manifest;
  patterns: Record<number, string>;
  viewDay: number;
}> {
  const manifest = await mergedManifest();
  const viewDay = resolveShellViewDay(
    manifest,
    now,
    canPublish,
    initialSelectedDay,
  );
  const pattern = await loadPublicPatternForDay(viewDay);
  return {
    manifest,
    patterns: { [viewDay]: pattern },
    viewDay,
  };
}

async function loadFromDb(manifest: Manifest): Promise<{
  days: DayEntry[];
  patterns: Record<number, string>;
} | null> {
  const rows = await loadDayRowsFromDb();
  if (!rows) return null;

  const days: DayEntry[] = [];
  const patterns: Record<number, string> = {};
  const filePatterns = loadAllPatterns(manifest);

  for (const row of rows) {
    const entry = rowToEntry(row, manifest);
    days.push(entry);
    patterns[entry.day] =
      row.pattern?.trim() ||
      filePatterns[entry.day] ||
      loadPattern(entry.strudelFile);
  }

  return { days, patterns };
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
