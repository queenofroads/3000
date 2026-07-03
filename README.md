# ARCTIC RUN: NORDEEP 3000

A tiny daily-play browser platformer. Run north across the Nordic ice,
grab glowing attendee orbs, stomp inbox monsters, and fill the event —
**3000 attendees secured** = win.

## Play

- **← → / A D** — move
- **SPACE / W / ↑** — jump (press again in the air to double-jump)
- **M** — mute · **N** — change your runner name
- On touch devices, on-screen buttons appear automatically.

On your first run you enter your name — every finished run lands on the
**🏆 Hall of Fame** (top scores with names, crowns 👑 for full-3000 wins),
shown on the start, win, and game-over screens.

Jump on inbox monsters to squash them (+50). Orbs are +10. Milestone
banner every 750. Three lives, gentle difficulty — a run takes 2–4 minutes.

Your best score, daily play streak ("Day 7 🔥"), name, and the Hall of
Fame are saved in `localStorage`, so play once a day to keep the streak
alive.

## Deploy

Everything is a single `index.html` — no build step, no dependencies.

**Vercel:** import this repo (or `vercel deploy` from the folder). Zero
config needed; it's served as a static site.

**Local:** just open `index.html` in a browser.

## Tweaking

All the knobs live in the `CONFIG` object at the top of the script in
`index.html`: brand colors, the 3000 goal, milestone step, scroll speed,
jump physics, lives, and scoring.
