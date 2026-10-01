#!/usr/bin/env node
/**
 * Publish one studiodaze-beatober day: pattern → Neon, optional approve + audio upload.
 *
 * Usage:
 *   node scripts/publish-day.mjs 3 --pattern content/patterns/03.strudel --approve
 *   node scripts/publish-day.mjs 3 --pattern content/patterns/03.strudel --approve --audio ~/beat.mp3
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const day = Number.parseInt(argv[2], 10);
  if (!Number.isFinite(day) || day < 1 || day > 31) {
    console.error(
      "Usage: node scripts/publish-day.mjs <day> [--pattern path] [--approve] [--audio path.mp3]",
    );
    process.exit(1);
  }
  let patternPath;
  let approve = false;
  let audioPath;
  for (let i = 3; i < argv.length; i += 1) {
    if (argv[i] === "--pattern") patternPath = argv[++i];
    else if (argv[i] === "--approve") approve = true;
    else if (argv[i] === "--audio") audioPath = argv[++i];
  }
  return { day, patternPath, approve, audioPath };
}

const url =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL ??
  process.env.POSTGRES_PRISMA_URL;

if (!url) {
  console.error("Set DATABASE_URL (vercel env pull).");
  process.exit(1);
}

const { day, patternPath, approve, audioPath } = parseArgs(process.argv);
const pad = String(day).padStart(2, "0");
const sql = neon(url);

if (patternPath) {
  const abs = join(process.cwd(), patternPath);
  if (!existsSync(abs)) {
    console.error("Pattern file not found:", abs);
    process.exit(1);
  }
  const code = readFileSync(abs, "utf8");
  await sql`
    INSERT INTO beatober_days (day, approved, title, strudel_file, pattern)
    VALUES (${day}, false, ${`Day ${day}`}, ${`${pad}.strudel`}, ${code})
    ON CONFLICT (day) DO UPDATE SET
      pattern = EXCLUDED.pattern,
      strudel_file = EXCLUDED.strudel_file,
      updated_at = now()
  `;
  console.log("Pattern saved for day", day);
}

if (approve) {
  await sql`
    UPDATE beatober_days SET approved = true, updated_at = now() WHERE day = ${day}
  `;
  console.log("Day", day, "approved");
}

if (audioPath) {
  const script = join(root, "scripts", "upload-beat.sh");
  const r = spawnSync(script, [String(day), audioPath], {
    stdio: "inherit",
    env: process.env,
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

console.log(
  "Done. Share:",
  `https://studiodaze-beatober.vercel.app/day/${day}`,
);
