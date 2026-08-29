CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL COLLATE NOCASE UNIQUE
        CHECK (length(username) BETWEEN 3 AND 20),
    email TEXT NOT NULL COLLATE NOCASE UNIQUE
        CHECK (length(email) BETWEEN 3 AND 254),
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    password_iterations INTEGER NOT NULL DEFAULT 210000,
    password_algorithm TEXT NOT NULL DEFAULT 'PBKDF2-SHA256',
    role TEXT NOT NULL DEFAULT 'player'
        CHECK (role IN ('player', 'admin', 'owner')),
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS users_username_index
ON users(username COLLATE NOCASE);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_index
ON users(email COLLATE NOCASE);
