const SESSION_COOKIE = "__Host-neon_session";
const VALID_ROLES = new Set(["player", "admin", "owner"]);

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

async function currentUser(request, env) {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token || !env.LEADERBOARD_DB) return null;
  const user = await env.LEADERBOARD_DB.prepare(`
    SELECT users.id, users.username, users.role, users.status
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ?1
      AND sessions.expires_at > ?2
      AND sessions.created_at > datetime('now', '-12 hours')
      AND users.status = 'active'
      AND users.role IN ('player', 'admin', 'owner')
    LIMIT 1
  `).bind(await sha256Hex(token), Math.floor(Date.now() / 1000)).first();
  return user && VALID_ROLES.has(user.role) ? user : null;
}

function protectedRole(pathname) {
  if (pathname === "/flex" || pathname === "/flex.html") return "staff";
  if (pathname === "/management" || pathname === "/management/" || pathname === "/management/index.html") return "staff";
  return "";
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const requiredRole = protectedRole(url.pathname);
  if (!requiredRole) return context.next();

  let user = null;
  try {
    user = await currentUser(context.request, context.env);
  } catch (error) {
    console.error("Unable to authorize protected page", error);
  }

  const allowed = requiredRole === "owner"
    ? user?.role === "owner"
    : user?.role === "admin" || user?.role === "owner";
  if (!allowed) {
    const destination = new URL("/", url);
    destination.searchParams.set("access", requiredRole);
    return new Response(null, {
      status: 302,
      headers: {
        "Cache-Control": "no-store",
        Location: destination.toString(),
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  const response = await context.next();
  const guarded = new Response(response.body, response);
  guarded.headers.set("Cache-Control", "private, no-store");
  guarded.headers.set("X-Content-Type-Options", "nosniff");
  guarded.headers.set("X-Frame-Options", "DENY");
  return guarded;
}
