#!/usr/bin/env node
import { neon } from "@neondatabase/serverless";

const url =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL ??
  process.env.POSTGRES_PRISMA_URL;

if (!url) {
  console.warn("[db-migrate] No DATABASE_URL — skipping (local build without DB).");
  process.exit(0);
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

await sql`
  CREATE TABLE IF NOT EXISTS analytics_events (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    event_name TEXT NOT NULL,
    visitor_id TEXT,
    session_id TEXT,
    day SMALLINT CHECK (day IS NULL OR (day >= 1 AND day <= 31)),
    props JSONB NOT NULL DEFAULT '{}'::jsonb,
    path TEXT,
    referrer_bucket TEXT
  )
`;

await sql`
  CREATE INDEX IF NOT EXISTS analytics_events_created_at_idx
  ON analytics_events (created_at DESC)
`;

await sql`
  CREATE INDEX IF NOT EXISTS analytics_events_event_name_idx
  ON analytics_events (event_name)
`;

await sql`
  ALTER TABLE analytics_events
  ADD COLUMN IF NOT EXISTS audience TEXT NOT NULL DEFAULT 'visitor'
`;

await sql`
  ALTER TABLE analytics_events
  ADD COLUMN IF NOT EXISTS referrer_source TEXT
`;

await sql`
  CREATE INDEX IF NOT EXISTS analytics_events_referrer_source_idx
  ON analytics_events (referrer_source)
  WHERE event_name = 'page_view' AND referrer_source IS NOT NULL
`;

await sql`
  ALTER TABLE analytics_events
  ADD COLUMN IF NOT EXISTS geo_country TEXT
`;

await sql`
  ALTER TABLE analytics_events
  ADD COLUMN IF NOT EXISTS geo_region TEXT
`;

await sql`
  CREATE INDEX IF NOT EXISTS analytics_events_geo_country_idx
  ON analytics_events (geo_country)
  WHERE event_name = 'page_view' AND geo_country IS NOT NULL
`;

await sql`
  CREATE TABLE IF NOT EXISTS device_registry (
    visitor_id TEXT PRIMARY KEY,
    role TEXT NOT NULL CHECK (role IN ('internal', 'ignore')),
    label TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;

console.log("[db-migrate] Schema applied.");
