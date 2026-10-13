CREATE TABLE github_connections (
  user_id TEXT PRIMARY KEY NOT NULL,
  encrypted_token TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
