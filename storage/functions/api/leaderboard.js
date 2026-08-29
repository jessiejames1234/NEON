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
        SELECT player_name, score, wave, kills, updated_at
        FROM leaderboard
        ORDER BY score DESC, wave DESC, kills DESC, updated_at ASC
        LIMIT 20
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

  const playerName = cleanPlayerName(body.name);
  const score = cleanInteger(body.score, 0, 1_000_000_000);
  const wave = cleanInteger(body.wave, 1, 50);
  const kills = cleanInteger(body.kills, 0, 1_000_000);

  if (playerName.length < 2) {
    return json({ error: "Name must contain 2 to 18 valid characters." }, 400);
  }

  try {
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
      .bind(playerName, score, wave, kills)
      .run();

    return json({
      success: true,
      player: { name: playerName, score, wave, kills },
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
