# Strudel engine (studiodaze-beatober)

Headless **`@strudel/web`** with a strudel.cc-style **prebake** (samples, synths, soundfonts, Hydra). Editor: **`@strudel/codemirror`** (`initEditor`) — autocomplete, pattern highlight, flash, line numbers; your toolbar/layout unchanged. No MiniREPL / SuperDirt.

## Boot

- `useStrudelSession` → `initStrudel({ prebake })`
- Prebake: `evalScope(draw, tonal, beatoberHydraScope)` + `loadBeatoberSamples()`
- First Play shows **Loading sounds…** until prebake finishes

## Editing

| Role | Behavior |
|------|----------|
| **Public, unlocked** | **Local remix** — `sessionStorage` per day; Reset restores published pattern |
| **Author** | `NEXT_PUBLIC_BEATOBER_AUTHOR=1` and/or **`/admin` login** — edit + ⌘S save to Neon/git |
| **Locked (public)** | Coming-soon placeholder; no Play |

## Production save auth

- **`beatober_admin` cookie** (after `/admin` login), or
- Header **`x-beatober-author: BEATOBER_AUTHOR_SECRET`** (scripts)

Browser saves use `fetch(..., { credentials: "include" })`.

## Hydra

Unlocked days: `await initHydra()` in pattern text; canvas `#hydra-canvas` behind UI. Hush clears Hydra.
