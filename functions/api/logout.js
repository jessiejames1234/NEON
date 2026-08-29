const SESSION_COOKIE = "__Host-neon_session";

function readCookie(request, name) {
  const match = request.headers.get("Cookie")?.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function onRequestPost({ request, env }) {
  const token = readCookie(request, SESSION_COOKIE);
  if (token) {
    try {
      await env.LEADERBOARD_DB.prepare("DELETE FROM sessions WHERE token_hash = ?1")
        .bind(await sha256Hex(token)).run();
    } catch (error) {
      console.error("Unable to remove session", error);
    }
  }
  return new Response(JSON.stringify({ success: true }), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      "Set-Cookie": `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`,
    },
  });
}
