// Shared global leaderboard for ARCTIC RUN: NORDEEP 3000.
//
// A Vercel serverless function backed by Upstash Redis (free tier).
// Setup: in your Vercel project, go to Storage → add "Upstash for Redis"
// (or any Upstash Redis integration) and redeploy. The integration sets
// the env vars below automatically. Until then the game quietly falls
// back to its per-device leaderboard.
//
//   GET  /api/scores          → { top: [{ n: "NAME", s: 2400 }, ...] }
//   POST /api/scores {name, score} → { ok: true }
//
// One entry per name: only a player's best score is kept (ZADD GT).

const REDIS_URL =
  process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN =
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const KEY = "nordeep3000:board";
const MAX_SCORE = 3100; // 3000 goal + small overshoot from the final pickup

async function redis(cmd) {
  const r = await fetch(REDIS_URL, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + REDIS_TOKEN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cmd),
  });
  if (!r.ok) throw new Error("redis error " + r.status);
  return (await r.json()).result;
}

module.exports = async (req, res) => {
  if (!REDIS_URL || !REDIS_TOKEN) {
    res.status(503).json({ error: "leaderboard backend not configured" });
    return;
  }
  try {
    if (req.method === "GET") {
      const flat = await redis(["ZRANGE", KEY, "0", "9", "REV", "WITHSCORES"]);
      const top = [];
      for (let i = 0; i < flat.length; i += 2) {
        top.push({ n: flat[i], s: Math.floor(Number(flat[i + 1])) });
      }
      res.setHeader("Cache-Control", "no-store");
      res.status(200).json({ top });
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
      // GT: only update when the new score beats the player's stored best
      await redis(["ZADD", KEY, "GT", String(score), name]);
      res.status(200).json({ ok: true });
    } else {
      res.status(405).json({ error: "method not allowed" });
    }
  } catch (e) {
    res.status(500).json({ error: "leaderboard unavailable" });
  }
};
