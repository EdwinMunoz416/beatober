# beatober

Public October beat + Strudel showcase (`studio-daze` header, separate GitHub/Vercel project).

## Local dev

```bash
cd beatober
cp .env.example .env.local
npm install
npm run dev
```

With `NEXT_PUBLIC_BEATOBER_AUTHOR=1` in `.env.local`:

- Select any day (including locked)
- Edit Strudel in the REPL (⌘/Ctrl+S save, ⌘/Ctrl+Enter play)
- **Approve day** when ready — public visitors unlock only when **approved** and **calendar day ≥ that day**

## Content

- `content/manifest.json` — year/month, per-day `approved`, optional `audioUrl`
- `content/patterns/NN.strudel` — one pattern file per day

## Beat audio (Vercel Blob)

1. Create a **Blob** store on the Vercel project and copy **Read/Write token** → `BLOB_READ_WRITE_TOKEN`.
2. Upload and patch manifest:

```bash
export BLOB_READ_WRITE_TOKEN=…
chmod +x scripts/upload-beat.sh
./scripts/upload-beat.sh 1 ~/path/to/day-01.mp3
git add content/manifest.json && git commit -m "Add day 1 beat" && git push
```

## Analytics

Enable **Web Analytics** in the Vercel project dashboard. Custom events: `day_view`, `strudel_play`, `play_beat` (see `src/lib/analytics.ts`).

## Font

`public/fonts/LEDLIGHT.otf` — Billy Argel *Ledlight* (personal use). See `public/fonts/README.txt`.

## Deploy

Own git remote + Vercel root = this folder. Enable Vercel Web Analytics in the project dashboard.
