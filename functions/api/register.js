// Cloudflare Workers Web Crypto currently caps PBKDF2 at 100,000 rounds.
const PBKDF2_ITERATIONS = 100_000;
const PASSWORD_HASH_BYTES = 32;

const RESPONSE_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: RESPONSE_HEADERS,
  });
}

function bytesToBase64(bytes) {
  return btoa(String.fromCharCode(...bytes));
}

function normalizeUsername(value) {
  return String(value ?? "").trim();
}

function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

function validUsername(username) {
  return /^[a-zA-Z0-9_]{3,20}$/.test(username);
}

function validEmail(email) {
  if (email.length > 254) return false;
  const [local = "", domain = "", ...extra] = email.split("@");
  if (extra.length || !local || local.length > 64 || local.startsWith(".") || local.endsWith(".") || local.includes("..")) return false;
  return /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(domain);
}

async function hashPassword(password, salt) {
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations: PBKDF2_ITERATIONS,
    },
    passwordKey,
    PASSWORD_HASH_BYTES * 8,
  );

  return bytesToBase64(new Uint8Array(derivedBits));
}

async function duplicateAccountMessage(env, username, email) {
  const result = await env.LEADERBOARD_DB.prepare(`
    SELECT username, email
    FROM users
    WHERE username = ?1 COLLATE NOCASE OR email = ?2 COLLATE NOCASE
  `).bind(username, email).all();
  const matches = result.results ?? [];
  const usernameTaken = matches.some((user) => String(user.username).toLowerCase() === username.toLowerCase());
  const emailTaken = matches.some((user) => String(user.email).toLowerCase() === email.toLowerCase());
  if (usernameTaken && emailTaken) return "That username and email are already registered.";
  if (usernameTaken) return "That username is already registered.";
  if (emailTaken) return "That email is already registered.";
  return "";
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

  const username = normalizeUsername(body.username);
  const email = normalizeEmail(body.email);
  const password = String(body.password ?? "");

  if (!validUsername(username)) {
    return json({
      error: "Username must be 3 to 20 characters using letters, numbers, or underscores.",
    }, 400);
  }

  if (!validEmail(email)) {
    return json({ error: "Enter a valid email address." }, 400);
  }

  if (password.length < 7 || password.length > 16 || !/[a-z]/i.test(password) || !/\d/.test(password)) {
    return json({ error: "Password must be 7–16 characters and contain at least 1 letter and 1 number." }, 400);
  }

  // Role and status deliberately do not come from the request. Public users
  // must never be able to register themselves as an administrator or owner.
  try {
    const duplicateMessage = await duplicateAccountMessage(env, username, email);
    if (duplicateMessage) return json({ error: duplicateMessage }, 409);
    const role = "player";
    const status = "active";
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const passwordHash = await hashPassword(password, salt);

    const result = await env.LEADERBOARD_DB
      .prepare(`
        INSERT INTO users (
          username,
          email,
          password_hash,
          password_salt,
          password_iterations,
          password_algorithm,
          role,
          status,
          created_at,
          updated_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, 'PBKDF2-SHA256', ?6, ?7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `)
      .bind(
        username,
        email,
        passwordHash,
        bytesToBase64(salt),
        PBKDF2_ITERATIONS,
        role,
        status,
      )
      .run();

    return json({
      success: true,
      user: {
        id: result.meta?.last_row_id ?? null,
        username,
        email,
        role,
        status,
      },
    }, 201);
  } catch (error) {
    const message = String(error?.message ?? error);
    if (message.includes("UNIQUE constraint failed")) {
      const conflictMessage = await duplicateAccountMessage(env, username, email);
      return json({ error: conflictMessage || "That username or email is already registered." }, 409);
    }

    console.error("Unable to register user", error);
    return json({ error: "The account could not be created." }, 500);
  }
}

export function onRequestGet() {
  return json({ error: "Use POST to register an account." }, 405);
}

export function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      Allow: "POST, OPTIONS",
      "Cache-Control": "no-store",
    },
  });
}
