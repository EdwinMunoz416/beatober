# studiodaze-beatober

Public October beat + Strudel showcase (`studio-daze` header, separate GitHub/Vercel project).

**Live:** https://studiodaze-beatober.vercel.app  
**GitHub:** https://github.com/EdwinMunoz416/studiodaze-beatober

## Infra (CLI — not manual dashboard-only)

From a linked project directory (`vercel link`):

```bash
chmod +x scripts/provision-studiodaze-beatober-infra.sh
./scripts/provision-studiodaze-beatober-infra.sh
```

Or step by step:

```bash
# Blob (public store, iad1) — legacy store name kept for existing uploads
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

Author UI: `NEXT_PUBLIC_BEATOBER_AUTHOR=1` in `.env.local`, **or** log in at `/admin` (same `BEATOBER_AUTHOR_SECRET`).

Production author API: **`beatober_admin` cookie** after `/admin` login, **or** header `x-beatober-author: <BEATOBER_AUTHOR_SECRET>` for scripts.

Public visitors get **read-only** patterns on unlocked days (play only); only authors persist to Neon/git.

Strudel engine details: **`docs/strudel-engine.md`** (prebake, Hydra, soundfonts).

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run db:migrate` | Create `beatober_days` table |
| `npm run db:seed` | Seed 31 days from `content/` |
| **`/admin`** → Day approval table | Approve/revoke (Neon or `content/manifest.json`) |
| `node scripts/db-approve-day.mjs 1` | Approve day in Neon (CLI) |
| `./scripts/upload-beat.sh` | Blob upload + Neon `audio_url` |
| `./scripts/publish-day.sh` | Pattern + optional `--approve` + `--audio` |

Share a day: **`/day/3`** (OG image for social previews). Sitemap: `/sitemap.xml`. Admin routes are `noindex`.

## Analytics (dual)

- **Vercel Hobby Web Analytics** — same custom events via `@vercel/analytics`.
- **Neon first-party** — `/api/events` → `analytics_events` table (richer detail, your data).

**Control room:** https://studiodaze-beatober.vercel.app/admin — password = `BEATOBER_AUTHOR_SECRET`.  
**Devices:** `/admin/devices` — tag this browser as **internal** or **ignore** (visitors-only metrics by default).

Events: `page_view` (`referrer_source`: discord, x, … + `referrer_host`), `share_landing`, … Admin **Traffic sources** uses first-touch vs all views. Optional `?utm_source=discord` on links.

After deploy: `npm run db:migrate` (adds `analytics_events` if missing).

## Font

`public/fonts/LEDLIGHT.otf` — Billy Argel *Ledlight* (personal use). See `public/fonts/README.txt`.
