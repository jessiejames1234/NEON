const SESSION_COOKIE = "__Host-neon_session";
const JSON_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function readCookie(request, name) {
  const match = request.headers.get("Cookie")?.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function getOwner(request, env) {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;

  return env.LEADERBOARD_DB.prepare(`
    SELECT users.id, users.username, users.role
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ?1
      AND sessions.expires_at > ?2
      AND sessions.created_at > datetime('now', '-12 hours')
      AND users.status = 'active'
      AND users.role = 'owner'
    LIMIT 1
  `).bind(await sha256Hex(token), Math.floor(Date.now() / 1000)).first();
}

function validUsername(username) {
  return /^[a-zA-Z0-9_]{3,20}$/.test(username);
}

function validEmail(email) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function integerInRange(value, minimum, maximum) {
  const number = Number(value);
  return Number.isInteger(number) && number >= minimum && number <= maximum ? number : null;
}

async function isLastActiveOwner(env, userId) {
  const result = await env.LEADERBOARD_DB.prepare(`
    SELECT COUNT(*) AS owner_count
    FROM users
    WHERE role = 'owner' AND status = 'active' AND id != ?1
  `).bind(userId).first();
  return Number(result?.owner_count || 0) === 0;
}

export async function onRequestGet({ request, env }) {
  try {
    const owner = await getOwner(request, env);
    if (!owner) return json({ error: "Owner access required." }, 403);

    const [usersResult, scoresResult] = await Promise.all([
      env.LEADERBOARD_DB.prepare(`
        SELECT id, username, email, role, status, created_at, updated_at
        FROM users
        ORDER BY created_at DESC, id DESC
        LIMIT 500
      `).all(),
      env.LEADERBOARD_DB.prepare(`
        SELECT
          leaderboard.id,
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
        LIMIT 500
      `).all(),
    ]);

    return json({
      owner: { id: owner.id, username: owner.username },
      users: usersResult.results ?? [],
      scores: scoresResult.results ?? [],
    });
  } catch (error) {
    console.error("Unable to load management overview", error);
    return json({ error: "Management data is temporarily unavailable." }, 500);
  }
}

export async function onRequestPatch({ request, env }) {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return json({ error: "Content-Type must be application/json." }, 415);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON request." }, 400);
  }

  try {
    const owner = await getOwner(request, env);
    if (!owner) return json({ error: "Owner access required." }, 403);

    const id = integerInRange(body.id, 1, 2_147_483_647);
    if (!id) return json({ error: "Invalid record ID." }, 400);

    if (body.entity === "user" && body.action === "set-status") {
      const status = String(body.status || "").toLowerCase();
      if (status !== "active" && status !== "inactive") {
        return json({ error: "Invalid account status." }, 400);
      }

      const user = await env.LEADERBOARD_DB.prepare(
        "SELECT id, username, role, status FROM users WHERE id = ?1 LIMIT 1",
      ).bind(id).first();
      if (!user) return json({ error: "User not found." }, 404);
      if (user.role === "owner" && user.status === "active" && status === "inactive" && await isLastActiveOwner(env, id)) {
        return json({ error: "The final active owner cannot be deactivated." }, 409);
      }

      await env.LEADERBOARD_DB.prepare(
        "UPDATE users SET status = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
      ).bind(status, id).run();
      if (status === "inactive") {
        await env.LEADERBOARD_DB.prepare("DELETE FROM sessions WHERE user_id = ?1").bind(id).run();
      }
      return json({ success: true, message: `${user.username} is now ${status}.` });
    }

    if (body.entity === "user" && body.action === "edit") {
      const username = String(body.username || "").trim();
      const email = String(body.email || "").trim().toLowerCase();
      const role = String(body.role || "").toLowerCase();
      if (!validUsername(username)) return json({ error: "Username must be 3-20 letters, numbers, or underscores." }, 400);
      if (!validEmail(email)) return json({ error: "Enter a valid email address." }, 400);
      if (!['player', 'admin', 'owner'].includes(role)) return json({ error: "Invalid account role." }, 400);

      const user = await env.LEADERBOARD_DB.prepare(
        "SELECT id, username, role, status FROM users WHERE id = ?1 LIMIT 1",
      ).bind(id).first();
      if (!user) return json({ error: "User not found." }, 404);
      if (user.role === "owner" && user.status === "active" && role !== "owner" && await isLastActiveOwner(env, id)) {
        return json({ error: "The final active owner cannot be demoted." }, 409);
      }

      await env.LEADERBOARD_DB.batch([
        env.LEADERBOARD_DB.prepare(`
          UPDATE users
          SET username = ?1, email = ?2, role = ?3, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?4
        `).bind(username, email, role, id),
        env.LEADERBOARD_DB.prepare(`
          UPDATE leaderboard
          SET player_name = ?1
          WHERE player_name = ?2 COLLATE NOCASE
        `).bind(username, user.username),
      ]);
      return json({ success: true, message: `${username}'s account was updated.` });
    }

    if (body.entity === "score" && body.action === "edit") {
      const points = integerInRange(body.score, 0, 1_000_000_000);
      const wave = integerInRange(body.wave, 1, 50);
      const kills = integerInRange(body.kills, 0, 1_000_000);
      if (points === null || wave === null || kills === null) {
        return json({ error: "Enter valid points, wave, and kills values." }, 400);
      }

      const scoreRecord = await env.LEADERBOARD_DB.prepare(
        "SELECT id, player_name FROM leaderboard WHERE id = ?1 LIMIT 1",
      ).bind(id).first();
      if (!scoreRecord) return json({ error: "Score record not found." }, 404);

      await env.LEADERBOARD_DB.prepare(`
        UPDATE leaderboard
        SET score = ?1, wave = ?2, kills = ?3, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?4
      `).bind(points, wave, kills, id).run();
      return json({ success: true, message: `${scoreRecord.player_name}'s score was updated.` });
    }

    return json({ error: "Unsupported management action." }, 400);
  } catch (error) {
    console.error("Unable to update management record", error);
    if (/UNIQUE constraint failed/i.test(String(error?.message))) {
      return json({ error: "That username or email is already in use." }, 409);
    }
    return json({ error: "The record could not be updated." }, 500);
  }
}

export function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: { Allow: "GET, PATCH, OPTIONS", "Cache-Control": "no-store" },
  });
}
