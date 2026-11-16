CREATE TABLE IF NOT EXISTS matches (
    match_id TEXT PRIMARY KEY,
    set_number INTEGER NOT NULL,
    queue_id INTEGER,
    game_version TEXT,
    played_at INTEGER,
    collected_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS participants (
    match_id TEXT NOT NULL,
    puuid TEXT NOT NULL,
    placement INTEGER NOT NULL,
    units_json TEXT NOT NULL,
    traits_json TEXT NOT NULL,
    PRIMARY KEY (match_id, puuid),
    FOREIGN KEY (match_id) REFERENCES matches(match_id)
);

CREATE INDEX IF NOT EXISTS idx_matches_set
ON matches(set_number, queue_id);

CREATE INDEX IF NOT EXISTS idx_participants_placement
ON participants(placement);
