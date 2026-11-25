# CCA 2026 welcome game + final game

Thin instrument for ~100 delegates: pre-event hot takes (5 statements), a number that links them to Day 3, a frozen stage reveal, and a one-page report. Spec: `CCA_GAME_BUILD_SPEC.md` (as supplied). Event-day steps: `RUNBOOK.md`.

**Stack:** Node >= 22.13, zero dependencies, built-in SQLite (`node:sqlite`), server-rendered HTML, one tiny JS file. Needs a host with a **persistent disk** (Render, Fly, Railway or a VPS). It will not work on Vercel (no persistent disk).

```
cp .env.example .env   # fill in, then export the vars
npm start              # http://localhost:3000
npm test               # 35 tests: linking, duplicates, closing, admin, CSV privacy, metrics, snapshots
DB_PATH=./data/rehearsal.db npm run seed-demo   # rehearsal data, separate DB only
```

| Route | What |
|---|---|
| `/`, `/start`, `/done`, `/door` | first page (CCA game experience), onboarding wizard, code screen, short version (door) |
| `/play` | welcome game: phone/tablet, upright. Needs a frozen + opened deck in `/admin/play` |
| `/final`, `/final/done` | Day 3 (name + number, or magic link from the email) |
| `/admin/*` | password (Basic auth, any username): dashboard, icebreaker, final, stories, volunteers, lookup, snapshots, report, exports |
| `/stage/icebreaker`, `/stage/final` | big screen, served from the latest frozen snapshot only |

Content (takes, facts, options, consent) is in `src/content.js`; UI copy is keyed in `src/i18n.js`. Metrics rules are in `src/metrics.js`.

**Look:** the CCA palette (white, heavy black type, red/green/gold) with the five programme partner logos in `public/logos/`. These are crops from the organisers' public graphic: replace them with the official kit files (same filenames). `SHOW_PARTNER_LOGOS=0` hides them everywhere.
