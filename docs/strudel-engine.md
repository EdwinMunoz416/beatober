# Strudel engine (studiodaze-beatober)

Headless **`@strudel/web`** with a strudel.cc-style **prebake** (samples, synths, soundfonts, Hydra). Editor: **`@strudel/codemirror`** (`initEditor`) — autocomplete, tooltips, pattern highlight, flash, line numbers; your toolbar/layout unchanged. No MiniREPL / SuperDirt.

## Boot

- `useStrudelSession` → `initStrudel({ prebake, id, onEvalError, onUpdateState, … })`
- `StrudelVisualBootstrap` → `#test-canvas` draw layer, CM widget types (`._pianoroll`, `._scope`, …), draw theme synced to site CSS
- Prebake: `evalScope(draw, tonal, webaudio, beatoberHydraScope)` + `loadBeatoberSamples()`
- First Play shows **Loading sounds…** until prebake finishes

## Pattern / playback UI

- **After eval:** `updateMiniLocations`, slider/widgets, `flash`
- **During playback:** `Drawer` runs painters (e.g. `all(pianoroll)`) on `#test-canvas` + `highlightMiniLocations` on active mini ranges
- **Draw window:** `[-2, 2]` cycles when the pattern has `.onPaint` painters; `[0, 0]` for highlight-only

## Visuals (same APIs as strudel.cc)

| API | Where it renders |
|-----|------------------|
| `all(pianoroll)` / `.pianoroll()` | Full-screen `#test-canvas` behind UI |
| `._pianoroll()` / `._punchcard()` / `._spiral()` / `._pitchwheel()` | Inline canvas widgets in the editor |
| `._scope()` / `._spectrum()` / `.scope()` / `.spectrum()` | Inline or default canvas (Web Audio analysers) |
| `await initHydra()` | `#hydra-canvas` (WebGL, behind UI) |

Hush / stop clears Hydra, draw animations, and mini highlights.

## Errors

- **Boot:** prebake / visual bootstrap failures → toolbar + alert under editor
- **Eval:** transpiler/runtime → `onEvalError` + `{ ok: false }` from `evaluate()` (no throw). Strudel’s `console.error` on syntax mistakes is muted during eval so Next dev does not show a duplicate overlay; production has no Next overlay anyway.
- **Scheduler:** `onUpdateState` → `schedulerError` surfaced like eval errors
- **Draw:** painter / highlight failures → non-fatal “Visual error” banner (dismissible)
- **React:** `StrudelErrorBoundary` around the REPL shell

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
