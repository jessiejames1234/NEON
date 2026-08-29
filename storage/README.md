# Neon Outpost D1 Leaderboard

This folder is a staging area for the shared online leaderboard and user accounts. Nothing outside `storage/` has been changed, and the game does not call these APIs yet.

## Files

- `schema.sql` creates the D1 leaderboard table and score index.
- `functions/api/leaderboard.js` is the Cloudflare Pages Function for reading and submitting scores.
- `users.sql` creates the user account table and unique indexes.
- `functions/api/register.js` securely registers player accounts.

## 1. Prepare the D1 database

Open the Cloudflare D1 database named `neon-outpost-leaderboard`, select **Console**, paste the contents of `schema.sql`, and select **Execute**.

Then paste the contents of `users.sql` and select **Execute** again.

The statements use `IF NOT EXISTS`, so running them again is safe.

## 2. Add the Pages binding

In Cloudflare, open:

**Workers & Pages > your GitHub-connected Pages project > Settings > Bindings**

Add a **D1 database** binding with:

- Variable name: `LEADERBOARD_DB`
- D1 database: `neon-outpost-leaderboard`

Save the binding.

## 3. Activate the API later

Cloudflare Pages only discovers Functions from a `/functions` directory at the repository root. The Function is deliberately inside `storage/functions/` for now because this task is limited to the new storage folder.

When leaderboard integration is approved, move or copy:

```text
storage/functions/api/leaderboard.js
storage/functions/api/register.js
```

to:

```text
functions/api/leaderboard.js
functions/api/register.js
```

Commit and push that root `functions/` directory to GitHub. Cloudflare will redeploy the Pages project and create this endpoint:

```text
https://YOUR-PROJECT.pages.dev/api/leaderboard
```

The registration endpoint will be:

```text
https://YOUR-PROJECT.pages.dev/api/register
```

## 4. API behavior

### Read the top 20

```http
GET /api/leaderboard
```

Example response:

```json
{
  "leaderboard": [
    {
      "player_name": "Jece",
      "score": 18500,
      "wave": 27,
      "kills": 143,
      "updated_at": "2026-08-29 10:00:00"
    }
  ]
}
```

### Submit a score

```http
POST /api/leaderboard
Content-Type: application/json

{
  "name": "Jece",
  "score": 18500,
  "wave": 27,
  "kills": 143
}
```

Each case-insensitive player name keeps only its highest score. Names are limited to 18 letters, numbers, spaces, underscores, or hyphens.

## 5. Test after deployment

Open this URL in a browser:

```text
https://YOUR-PROJECT.pages.dev/api/leaderboard
```

A working empty leaderboard returns:

```json
{"leaderboard":[]}
```

PowerShell submission test:

```powershell
$body = @{ name = "Test Player"; score = 1200; wave = 5; kills = 20 } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "https://YOUR-PROJECT.pages.dev/api/leaderboard" -ContentType "application/json" -Body $body
```

## User accounts

The `users` table contains:

- `username` — unique and case-insensitive
- `email` — unique and case-insensitive
- `password_hash` — the derived password hash
- `password_salt` — a unique random salt for each account
- `password_iterations` and `password_algorithm` — information required to verify passwords later
- `role` — `player`, `admin`, or `owner`
- `status` — `active` or `inactive`

Passwords are processed with salted PBKDF2-SHA256 using Cloudflare Workers Web Crypto and are never stored or returned as plain text.

Public registration always creates an `active` account with the `player` role. The endpoint intentionally ignores any requested role or status so users cannot make themselves an administrator or owner.

Registration request:

```http
POST /api/register
Content-Type: application/json

{
  "username": "Jece",
  "email": "jece@example.com",
  "password": "replace-with-a-strong-password"
}
```

PowerShell registration test after deployment:

```powershell
$account = @{ username = "TestPlayer"; email = "test@example.com"; password = "TestPassword123!" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "https://YOUR-PROJECT.pages.dev/api/register" -ContentType "application/json" -Body $account
```

This creates accounts only. Login sessions, email verification, password reset, and administrator account management still need separate endpoints before authentication is production-ready.

## Security note

The APIs validate inputs and use prepared SQL statements. However, the browser still supplies leaderboard scores, so a determined player could submit a fake value. Strong anti-cheat would require server-authoritative run validation.

Do not manually store plain-text passwords in D1. Do not allow the registration request to choose `role` or `status`. Before public release, add rate limiting or Cloudflare Turnstile to reduce automated account creation.
