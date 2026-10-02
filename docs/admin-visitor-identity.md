# Admin visitor identity

Private **Metrics / Live** labels only (password-protected `/admin`). Not shown on the public site.

## Rules

1. **One browser → one character** — each `visitor_id` gets a single row in `visitor_nicknames` on first analytics event; identity is stable after assignment (reconcile on migrate only fixes invalid/duplicate rows).
2. **No duplicate characters** — each `character_id` may be assigned to at most one visitor (`UNIQUE` on `character_id`).
3. **No duplicate display names** — nicknames are unique case-insensitively; new slots skip pool names already taken.
4. **No hash assignment** — “first free slot” in `identity_pool.sort_order`, not `hash % poolSize`.
5. **Pool lives in Neon** — table `identity_pool` is the runtime source of truth. `src/data/visitor-identity-pool.json` seeds an empty DB only (first migrate / offline dev).
6. **Auto expansion** — when free slots drop below threshold, Jikan v4 appends new characters (no redeploy). Triggers: `db:migrate`, `npm run db:expand-pool`, first-time visitor assign (`/api/events`).

## Commands

```bash
npm run db:migrate        # schema + seed + expand buffer + backfill + reconcile
npm run db:expand-pool    # grow identity_pool on Neon only (DATABASE_URL)
npm run sync:identity-pool  # optional: refresh JSON + upsert any new rows into Neon
```

Env tuning (optional): `IDENTITY_POOL_MIN_FREE`, `IDENTITY_POOL_TARGET_NEW` for `db:expand-pool`.

## Limits

- Jikan rate limits / outages: expand retries and skips; assignment may wait until a later event or manual `db:expand-pool`.
- Same human, two browsers → two characters until pool is exhausted.
- `/api/events` expand is capped (~12s) so requests stay bounded; heavy growth use `db:expand-pool`.

## Attribution

Character data and images via [Jikan](https://jikan.moe) (MyAnimeList). Admin hotlink only.
