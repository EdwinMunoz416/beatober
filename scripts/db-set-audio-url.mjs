#!/usr/bin/env node
import { neon } from "@neondatabase/serverless";

const day = Number(process.argv[2]);
const audioUrl = process.argv[3];

if (!Number.isFinite(day) || !audioUrl?.startsWith("https://")) {
  console.error("Usage: node scripts/db-set-audio-url.mjs <day> <https-url>");
  process.exit(1);
}

const url =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL ??
  process.env.POSTGRES_PRISMA_URL;

if (!url) {
  console.error("Set DATABASE_URL");
  process.exit(1);
}

const pad = String(day).padStart(2, "0");
const sql = neon(url);
await sql`
  INSERT INTO beatober_days (day, approved, title, strudel_file, audio_url)
  VALUES (${day}, false, ${`Day ${day}`}, ${`${pad}.strudel`}, ${audioUrl})
  ON CONFLICT (day) DO UPDATE SET audio_url = EXCLUDED.audio_url, updated_at = now()
`;
console.log("Neon audio_url set for day", day);
