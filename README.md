# beatober

Public October beat + Strudel showcase (`studio-daze` header, separate GitHub/Vercel project).

**Live:** https://beatober.vercel.app

## Infra (CLI — not manual dashboard-only)

From a linked project directory (`vercel link`):

```bash
chmod +x scripts/provision-beatober-infra.sh
./scripts/provision-beatober-infra.sh
```

Or step by step:

```bash
# Blob (public store, iad1)
npx vercel storage create beatober-media --type blob --access public --region iad1
npx vercel storage connect beatober-media --yes

# Neon Postgres (marketplace)
npx vercel integration add neon --name beatober-db --non-interactive

npx vercel env pull .env.local --yes --environment=development
npm run db:migrate && npm run db:seed
```

**Blob uploads** use project OIDC after `env pull` (no static RW token required):

```bash
./scripts/upload-beat.sh 1 ~/path/to/beat.mp3
```

**Production state** (approve, pattern, audio URL) lives in **Neon** when `DATABASE_URL` is set on Vercel. Git `content/` remains the seed/fallback for local dev without DB.

## Local dev

```bash
cp .env.example .env.local
npx vercel env pull .env.local   # DATABASE_URL, BLOB_STORE_ID, …
npm install
npm run dev
```

Author UI: `NEXT_PUBLIC_BEATOBER_AUTHOR=1` in `.env.local`.

Production author API: header `x-beatober-author: <BEATOBER_AUTHOR_SECRET>` (set in Vercel env).

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run db:migrate` | Create `beatober_days` table |
| `npm run db:seed` | Seed 31 days from `content/` |
| `node scripts/db-approve-day.mjs 1` | Approve day in Neon |
| `./scripts/upload-beat.sh` | Blob upload + Neon `audio_url` |
| `./scripts/publish-day.sh` | Pattern + optional `--approve` + `--audio` |

Share a day: **`/day/3`** (OG image for social previews). Sitemap: `/sitemap.xml`. Admin routes are `noindex`.

## Analytics (dual)

- **Vercel Hobby Web Analytics** — same custom events via `@vercel/analytics`.
- **Neon first-party** — `/api/events` → `analytics_events` table (richer detail, your data).

**Control room:** https://beatober.vercel.app/admin — password = `BEATOBER_AUTHOR_SECRET`.  
**Devices:** `/admin/devices` — tag this browser as **internal** or **ignore** (visitors-only metrics by default).

Events: `page_view`, `day_view`, `day_select`, `day_locked_interaction`, `play_beat`, `beat_*`, `strudel_*`.

After deploy: `npm run db:migrate` (adds `analytics_events` if missing).

## Font

`public/fonts/LEDLIGHT.otf` — Billy Argel *Ledlight* (personal use). See `public/fonts/README.txt`.
