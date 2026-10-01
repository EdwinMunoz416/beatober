CREATE TABLE IF NOT EXISTS beatober_days (
  day SMALLINT PRIMARY KEY CHECK (day >= 1 AND day <= 31),
  approved BOOLEAN NOT NULL DEFAULT false,
  title TEXT,
  strudel_file TEXT NOT NULL,
  audio_url TEXT,
  pattern TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
