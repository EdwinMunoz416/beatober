#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const url =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL ??
  process.env.POSTGRES_PRISMA_URL;

if (!url) {
  console.error("Set DATABASE_URL (vercel env pull).");
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(
  readFileSync(join(root, "content", "manifest.json"), "utf8"),
);
const patternsDir = join(root, "content", "patterns");

const sql = neon(url);

for (let day = 1; day <= 31; day += 1) {
  const pad = String(day).padStart(2, "0");
  const fromManifest = manifest.days?.find((d) => d.day === day);
  const strudelFile = fromManifest?.strudelFile ?? `${pad}.strudel`;
  let pattern = null;
  try {
    pattern = readFileSync(join(patternsDir, strudelFile), "utf8");
  } catch {
    pattern = null;
  }

  await sql`
    INSERT INTO beatober_days (day, approved, title, strudel_file, audio_url, pattern)
    VALUES (
      ${day},
      ${fromManifest?.approved ?? false},
      ${fromManifest?.title ?? `Day ${day}`},
      ${strudelFile},
      ${fromManifest?.audioUrl ?? null},
      ${pattern}
    )
    ON CONFLICT (day) DO UPDATE SET
      title = EXCLUDED.title,
      strudel_file = EXCLUDED.strudel_file,
      audio_url = COALESCE(beatober_days.audio_url, EXCLUDED.audio_url),
      pattern = COALESCE(beatober_days.pattern, EXCLUDED.pattern)
  `;
}

console.log("Seeded 31 days from content/manifest.json + patterns.");
