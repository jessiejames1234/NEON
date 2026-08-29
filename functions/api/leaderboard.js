const RESPONSE_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
};

const SESSION_COOKIE = "__Host-neon_session";

function readCookie(request, name) {
  const match = request.headers.get("Cookie")?.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function authenticatedUser(request, env) {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;
  return env.LEADERBOARD_DB.prepare(`
    SELECT users.id, users.username, users.role, users.status
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ?1
      AND sessions.expires_at > ?2
      AND users.status = 'active'
    LIMIT 1
  `).bind(await sha256Hex(token), Math.floor(Date.now() / 1000)).first();
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: RESPONSE_HEADERS,
  });
}

function cleanInteger(value, minimum, maximum) {
  const number = Number(value);
  if (!Number.isFinite(number)) return minimum;
  return Math.min(maximum, Math.max(minimum, Math.floor(number)));
}

function cleanPlayerName(value) {
  return String(value ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9 _-]/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 18);
}

export async function onRequestGet({ env }) {
  try {
    const result = await env.LEADERBOARD_DB
      .prepare(`
        SELECT
          leaderboard.player_name,
          leaderboard.score,
          leaderboard.wave,
          leaderboard.kills,
          leaderboard.updated_at,
          COALESCE(users.role, 'player') AS role
        FROM leaderboard
        LEFT JOIN users
          ON users.username = leaderboard.player_name COLLATE NOCASE
        ORDER BY leaderboard.score DESC,
                 leaderboard.wave DESC,
                 leaderboard.kills DESC,
                 leaderboard.updated_at ASC
        LIMIT 100
      `)
      .all();

    return json({ leaderboard: result.results ?? [] });
  } catch (error) {
    console.error("Unable to read leaderboard", error);
    return json({ error: "Leaderboard is temporarily unavailable." }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return json({ error: "Content-Type must be application/json." }, 415);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON request." }, 400);
  }

  const score = cleanInteger(body.score, 0, 1_000_000_000);
  const wave = cleanInteger(body.wave, 1, 50);
  const kills = cleanInteger(body.kills, 0, 1_000_000);

  try {
    const user = await authenticatedUser(request, env);
    if (!user) return json({ error: "Login required." }, 401);
    const authenticatedName = cleanPlayerName(user.username);

    await env.LEADERBOARD_DB
      .prepare(`
        INSERT INTO leaderboard
          (player_name, score, wave, kills, updated_at)
        VALUES (?1, ?2, ?3, ?4, CURRENT_TIMESTAMP)
        ON CONFLICT(player_name) DO UPDATE SET
          score = MAX(leaderboard.score, excluded.score),
          wave = CASE
            WHEN excluded.score >= leaderboard.score THEN excluded.wave
            ELSE leaderboard.wave
          END,
          kills = CASE
            WHEN excluded.score >= leaderboard.score THEN excluded.kills
            ELSE leaderboard.kills
          END,
          updated_at = CASE
            WHEN excluded.score >= leaderboard.score THEN CURRENT_TIMESTAMP
            ELSE leaderboard.updated_at
          END
      `)
      .bind(authenticatedName, score, wave, kills)
      .run();

    return json({
      success: true,
      player: { name: authenticatedName, score, wave, kills },
    });
  } catch (error) {
    console.error("Unable to save leaderboard score", error);
    return json({ error: "The score could not be saved." }, 500);
  }
}

export function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      Allow: "GET, POST, OPTIONS",
      "Cache-Control": "no-store",
    },
  });
}
