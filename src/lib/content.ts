import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export type DayEntry = {
  day: number;
  approved: boolean;
  title?: string;
  strudelFile: string;
  audioUrl?: string;
};

export type Manifest = {
  year: number;
  month: number;
  days: DayEntry[];
};

const contentRoot = join(process.cwd(), "content");
const patternsDir = join(contentRoot, "patterns");

function padDay(day: number): string {
  return String(day).padStart(2, "0");
}

export function loadManifest(): Manifest {
  const path = join(contentRoot, "manifest.json");
  const raw = JSON.parse(readFileSync(path, "utf8")) as Manifest;
  const byDay = new Map(raw.days.map((d) => [d.day, d]));
  const days: DayEntry[] = [];
  for (let day = 1; day <= 31; day += 1) {
    const existing = byDay.get(day);
    days.push(
      existing ?? {
        day,
        approved: false,
        strudelFile: `${padDay(day)}.strudel`,
        title: `Day ${day}`,
      },
    );
  }
  return { year: raw.year, month: raw.month, days };
}

export function loadPattern(strudelFile: string): string {
  const path = join(patternsDir, strudelFile);
  if (!existsSync(path)) {
    return `$: note("c3").s("sawtooth").gain(0.4)\n// ${strudelFile} — add your pattern in content/patterns/`;
  }
  return readFileSync(path, "utf8");
}

export function loadAllPatterns(manifest: Manifest): Record<number, string> {
  const out: Record<number, string> = {};
  for (const d of manifest.days) {
    out[d.day] = loadPattern(d.strudelFile);
  }
  return out;
}

export function manifestPath(): string {
  return join(contentRoot, "manifest.json");
}

export function patternPath(strudelFile: string): string {
  return join(patternsDir, strudelFile);
}
