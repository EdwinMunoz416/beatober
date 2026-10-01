#!/usr/bin/env node
import { neon } from "@neondatabase/serverless";

const url =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL ??
  process.env.POSTGRES_PRISMA_URL;

if (!url) {
  console.error("Set DATABASE_URL (vercel env pull).");
  process.exit(1);
}

const sql = neon(url);

await sql`
  CREATE TABLE IF NOT EXISTS beatober_days (
    day SMALLINT PRIMARY KEY CHECK (day >= 1 AND day <= 31),
    approved BOOLEAN NOT NULL DEFAULT false,
    title TEXT,
    strudel_file TEXT NOT NULL,
    audio_url TEXT,
    pattern TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;

console.log("beatober_days schema applied.");
