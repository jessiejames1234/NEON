const PBKDF2_HASH_BYTES = 32;
const SESSION_SECONDS = 60 * 60 * 12;
const SESSION_COOKIE = "__Host-neon_session";

const JSON_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
};

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders },
  });
}

function fromBase64(value) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

function toBase64(bytes) {
  return btoa(String.fromCharCode(...bytes));
}

async function derivePassword(password, salt, iterations) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits({
    name: "PBKDF2",
    hash: "SHA-256",
    salt,
    iterations,
  }, key, PBKDF2_HASH_BYTES * 8);
  return new Uint8Array(bits);
}

function equalBytes(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function onRequestPost({ request, env }) {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return json({ error: "Content-Type must be application/json." }, 415);
  }

  try {
    const body = await request.json();
    const username = String(body.username ?? "").trim();
    const password = String(body.password ?? "");
    if (!username || !password) return json({ error: "Username and password are required." }, 400);

    const user = await env.LEADERBOARD_DB.prepare(`
      SELECT id, username, email, password_hash, password_salt,
             password_iterations, password_algorithm, role, status
      FROM users
      WHERE username = ?1 COLLATE NOCASE
      LIMIT 1
    `).bind(username).first();

    if (!user || user.password_algorithm !== "PBKDF2-SHA256") {
      return json({ error: "Invalid username or password." }, 401);
    }
    const derived = await derivePassword(password, fromBase64(user.password_salt), user.password_iterations);
    if (!equalBytes(derived, fromBase64(user.password_hash))) {
      return json({ error: "Invalid username or password." }, 401);
    }
    if (user.status !== "active") {
      return json({ error: "Your account is currently inactive. Please contact an administrator for assistance." }, 403);
    }

    const token = toBase64(crypto.getRandomValues(new Uint8Array(32)))
      .replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
    const now = Math.floor(Date.now() / 1000);
    await env.LEADERBOARD_DB.prepare(`
      DELETE FROM sessions
      WHERE expires_at <= ?1 OR created_at <= datetime('now', '-12 hours')
    `).bind(now).run();
    await env.LEADERBOARD_DB.prepare(`
      INSERT INTO sessions (token_hash, user_id, expires_at, created_at, last_seen_at)
      VALUES (?1, ?2, ?3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(await sha256Hex(token), user.id, now + SESSION_SECONDS).run();

    return json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        sessionExpiresAt: now + SESSION_SECONDS,
      },
    }, 200, {
      "Set-Cookie": `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_SECONDS}; Priority=High`,
    });
  } catch (error) {
    console.error("Unable to log in", error);
    return json({ error: "Login is temporarily unavailable." }, 500);
  }
}

export function onRequestGet() {
  return json({ error: "Use POST to log in." }, 405);
}
