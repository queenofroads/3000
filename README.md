# ARCTIC RUN: NORDEEP 3000

A tiny daily-play browser platformer. Run north across the Nordic ice,
grab glowing attendee orbs, stomp inbox monsters, and fill the event —
**3000 attendees secured** = win.

## Play

- **← → / A D** — move
- **SPACE / W / ↑** — jump (press again in the air to double-jump)
- **M** — mute · **N** — change your runner name
- On touch devices, on-screen buttons appear automatically.

The game opens with a name popup — every finished run lands on the
leaderboard (top scores with names, crowns 👑 for full-3000 wins), shown
on the start, win, and game-over screens.

## Shared global leaderboard (see everyone's scores)

Out of the box the leaderboard is per-device. To make it **global** —
every player sees everyone's best scores — the repo ships a tiny
serverless function (`api/scores.js`) that works with either backend,
auto-detected from the project's env vars:

**Option A — Supabase** (Vercel marketplace integration):
1. Connect Supabase to the Vercel project (sets `SUPABASE_URL` and
   `SUPABASE_SERVICE_ROLE_KEY` automatically).
2. In the Supabase dashboard → SQL Editor, run once:
   ```sql
   create table if not exists public.scores (
     name text primary key,
     score integer not null,
     updated_at timestamptz not null default now()
   );
   ```
3. Redeploy on Vercel.

**Option B — Upstash Redis** (Vercel marketplace integration):
1. Add **Upstash for Redis** and connect it to the project (sets
   `KV_REST_API_URL`/`KV_REST_API_TOKEN` automatically). No SQL needed.
2. Redeploy.

The board panel switches from "🏆 HALL OF FAME · this device" to
"🌍 GLOBAL TOP · all players" on its own once the backend responds.
Only each player's best score is kept (one row per name). If the
backend is missing or down, the game quietly falls back to the
per-device board — nothing breaks.

Jump on inbox monsters to squash them (+50). Orbs are +10. Milestone
banner every 750. Three lives, gentle difficulty — a run takes 2–4 minutes.

Your best score, daily play streak ("Day 7 🔥"), name, and the Hall of
Fame are saved in `localStorage`, so play once a day to keep the streak
alive.

## Deploy

A single `index.html` plus an optional `api/scores.js` serverless
function — no build step, no dependencies.

**Vercel:** import this repo (or `vercel deploy` from the folder). Zero
config needed; it's served as a static site.

**Local:** just open `index.html` in a browser.

## Tweaking

All the knobs live in the `CONFIG` object at the top of the script in
`index.html`: brand colors, the 3000 goal, milestone step, scroll speed,
jump physics, lives, and scoring.
