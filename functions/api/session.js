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

export async function onRequestGet({ request, env }) {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return json({ authenticated: false }, 401);

  try {
    const tokenHash = await sha256Hex(token);
    const user = await env.LEADERBOARD_DB.prepare(`
      SELECT users.id, users.username, users.email, users.role, users.status
      FROM sessions
      JOIN users ON users.id = sessions.user_id
      WHERE sessions.token_hash = ?1 AND sessions.expires_at > ?2
      LIMIT 1
    `).bind(tokenHash, Math.floor(Date.now() / 1000)).first();

    if (!user || user.status !== "active") return json({ authenticated: false }, 401);
    await env.LEADERBOARD_DB.prepare(
      "UPDATE sessions SET last_seen_at = CURRENT_TIMESTAMP WHERE token_hash = ?1",
    ).bind(tokenHash).run();
    return json({
      authenticated: true,
      user: { id: user.id, username: user.username, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error("Unable to read session", error);
    return json({ error: "Session check is temporarily unavailable." }, 500);
  }
}
