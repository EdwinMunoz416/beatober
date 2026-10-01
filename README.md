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

## Font

`public/fonts/LEDLIGHT.otf` — Billy Argel *Ledlight* (personal use). See `public/fonts/README.txt`.

## Deploy

Own git remote + Vercel root = this folder. Enable Vercel Web Analytics in the project dashboard.
