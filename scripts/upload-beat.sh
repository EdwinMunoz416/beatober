#!/usr/bin/env bash
# Upload a beat MP3 to Vercel Blob and patch content/manifest.json audioUrl.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DAY="${1:-}"
FILE="${2:-}"
YEAR="${BEATOBER_YEAR:-2026}"

if [[ -z "$DAY" || -z "$FILE" ]]; then
  echo "Usage: $0 <day 1-31> <path-to-audio.mp3>" >&2
  echo "Requires BLOB_READ_WRITE_TOKEN in env (from Vercel → Storage → Blob)." >&2
  exit 1
fi

DAY_PADDED="$(printf '%02d' "$DAY")"
if [[ ! -f "$FILE" ]]; then
  echo "File not found: $FILE" >&2
  exit 1
fi

PATHNAME="beatober/${YEAR}/day-${DAY_PADDED}.mp3"
echo "Uploading to blob://${PATHNAME} …"
if [[ -n "${BLOB_READ_WRITE_TOKEN:-}" ]]; then
  BLOB_OUT="$(npx vercel@latest blob put "$FILE" --pathname "$PATHNAME" --rw-token "$BLOB_READ_WRITE_TOKEN")"
else
  # Linked project + vercel env pull → OIDC / BLOB_STORE_ID
  BLOB_OUT="$(npx vercel@latest blob put "$FILE" --pathname "$PATHNAME")"
fi
URL="$(node -e "
const line = process.argv[1];
const m = line.match(/https:\\/\\/[^\\s]+/);
if (!m) process.exit(1);
console.log(m[0]);
" "$BLOB_OUT")"

echo "URL: $URL"

if [[ -n "${DATABASE_URL:-}${POSTGRES_URL:-}" ]]; then
  node "$ROOT/scripts/db-set-audio-url.mjs" "$DAY" "$URL"
else
  node <<NODE
const fs = require("fs");
const path = require("path");
const manifestPath = path.join("$ROOT", "content", "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const day = Number("$DAY");
let idx = manifest.days.findIndex((d) => d.day === day);
const base = {
  day,
  strudelFile: "${DAY_PADDED}.strudel",
  title: \`Day \${day}\`,
  approved: false,
};
if (idx >= 0) manifest.days[idx] = { ...manifest.days[idx], ...base, audioUrl: "$URL" };
else manifest.days.push({ ...base, audioUrl: "$URL" });
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\\n");
console.log("Updated content/manifest.json for day", day);
NODE
fi
