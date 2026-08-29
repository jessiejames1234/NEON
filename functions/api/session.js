const SESSION_COOKIE = "__Host-neon_session";
const JSON_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function expiredCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

function readCookie(request, name) {
  const match = request.headers.get("Cookie")?.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  if (!match) return "";
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return "";
  }
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function onRequestGet({ request, env }) {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return json({ authenticated: false }, 401);

  try {
    const tokenHash = await sha256Hex(token);
    const user = await env.LEADERBOARD_DB.prepare(`
      SELECT users.id, users.username, users.email, users.role, users.status,
             MIN(
               sessions.expires_at,
               CAST(strftime('%s', sessions.created_at, '+12 hours') AS INTEGER)
             ) AS session_expires_at
      FROM sessions
      JOIN users ON users.id = sessions.user_id
      WHERE sessions.token_hash = ?1
        AND sessions.expires_at > ?2
        AND sessions.created_at > datetime('now', '-12 hours')
        AND users.status = 'active'
        AND users.role IN ('player', 'admin', 'owner')
      LIMIT 1
    `).bind(tokenHash, Math.floor(Date.now() / 1000)).first();

    if (!user) {
      await env.LEADERBOARD_DB.prepare("DELETE FROM sessions WHERE token_hash = ?1").bind(tokenHash).run();
      return new Response(JSON.stringify({ authenticated: false }), {
        status: 401,
        headers: { ...JSON_HEADERS, "Set-Cookie": expiredCookie() },
      });
    }
    await env.LEADERBOARD_DB.prepare(
      "UPDATE sessions SET last_seen_at = CURRENT_TIMESTAMP WHERE token_hash = ?1",
    ).bind(tokenHash).run();
    return json({
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        sessionExpiresAt: user.session_expires_at,
      },
    });
  } catch (error) {
    console.error("Unable to read session", error);
    return json({ error: "Session check is temporarily unavailable." }, 500);
  }
}
