CREATE TABLE IF NOT EXISTS beatober_days (
  day SMALLINT PRIMARY KEY CHECK (day >= 1 AND day <= 31),
  approved BOOLEAN NOT NULL DEFAULT false,
  title TEXT,
  strudel_file TEXT NOT NULL,
  audio_url TEXT,
  pattern TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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
);

CREATE INDEX IF NOT EXISTS analytics_events_created_at_idx ON analytics_events (created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_events_event_name_idx ON analytics_events (event_name);
