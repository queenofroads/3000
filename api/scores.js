// Shared global leaderboard for ARCTIC RUN: NORDEEP 3000.
//
// A Vercel serverless function. Works with either backend — it picks up
// whichever integration is connected to the project:
//
//   • Supabase (Vercel marketplace integration). One-time setup: run this
//     in the Supabase SQL editor, then redeploy:
//
//         create table if not exists public.scores (
//           name text primary key,
//           score integer not null,
//           updated_at timestamptz not null default now()
//         );
//
//   • Upstash Redis (KV_REST_API_URL / UPSTASH_REDIS_REST_URL env vars).
//     No setup beyond adding the integration.
//
// Until a backend answers, the game quietly falls back to its
// per-device leaderboard.
//
//   GET  /api/scores               → { top: [{ n: "NAME", s: 2400 }, ...] }
//   POST /api/scores {name, score} → { ok: true }
//
// One row per name: only a player's best score is kept.

const MAX_SCORE = 3100; // 3000 goal + small overshoot from the final pickup

/* ---------------- Supabase (PostgREST) ---------------- */
const SB_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function sb(path, opts = {}) {
  const r = await fetch(SB_URL + "/rest/v1/" + path, {
    ...opts,
    headers: {
      apikey: SB_KEY,
      Authorization: "Bearer " + SB_KEY,
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });
  if (!r.ok) throw new Error("supabase " + r.status);
  const text = await r.text();
  return text ? JSON.parse(text) : null;
}

const supabaseStore = {
  available: () => !!(SB_URL && SB_KEY),
  async top() {
    const rows = await sb("scores?select=name,score&order=score.desc&limit=10");
    return rows.map((r) => ({ n: r.name, s: r.score }));
  },
  async submit(name, score) {
    // Keep only the player's best (tiny read-then-write race is fine here)
    const rows = await sb("scores?name=eq." + encodeURIComponent(name) + "&select=score");
    if (rows.length && rows[0].score >= score) return;
    await sb("scores?on_conflict=name", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({ name, score, updated_at: new Date().toISOString() }),
    });
  },
};

/* ---------------- Upstash Redis (REST) ---------------- */
const REDIS_URL =
  process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN =
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const REDIS_KEY = "nordeep3000:board";

async function redis(cmd) {
  const r = await fetch(REDIS_URL, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + REDIS_TOKEN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cmd),
  });
  if (!r.ok) throw new Error("redis " + r.status);
  return (await r.json()).result;
}

const redisStore = {
  available: () => !!(REDIS_URL && REDIS_TOKEN),
  async top() {
    const flat = await redis(["ZRANGE", REDIS_KEY, "0", "9", "REV", "WITHSCORES"]);
    const top = [];
    for (let i = 0; i < flat.length; i += 2) {
      top.push({ n: flat[i], s: Math.floor(Number(flat[i + 1])) });
    }
    return top;
  },
  async submit(name, score) {
    // GT: only update when the new score beats the player's stored best
    await redis(["ZADD", REDIS_KEY, "GT", String(score), name]);
  },
};

/* ---------------- Handler ---------------- */
module.exports = async (req, res) => {
  const store = supabaseStore.available()
    ? supabaseStore
    : redisStore.available()
      ? redisStore
      : null;
  if (!store) {
    res.status(503).json({ error: "leaderboard backend not configured" });
    return;
  }
  try {
    if (req.method === "GET") {
      res.setHeader("Cache-Control", "no-store");
      res.status(200).json({ top: await store.top() });
    } else if (req.method === "POST") {
      const body = typeof req.body === "object" && req.body ? req.body : {};
      const name =
        String(body.name || "")
          .toUpperCase()
          .replace(/[^A-Z0-9 ._-]/g, "")
          .trim()
          .slice(0, 12) || "RUNNER";
      let score = Math.floor(Number(body.score));
      if (!Number.isFinite(score) || score <= 0) {
        res.status(400).json({ error: "bad score" });
        return;
      }
      score = Math.min(score, MAX_SCORE);
      await store.submit(name, score);
      res.status(200).json({ ok: true });
    } else {
      res.status(405).json({ error: "method not allowed" });
    }
  } catch (e) {
    res.status(500).json({ error: "leaderboard unavailable" });
  }
};
