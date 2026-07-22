CREATE TABLE IF NOT EXISTS game_saves (
  slot TEXT PRIMARY KEY,
  state_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_game_saves_updated ON game_saves(updated_at);
