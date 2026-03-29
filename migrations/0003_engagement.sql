CREATE TABLE IF NOT EXISTS engagement_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  hashed_user_id TEXT,
  feed_id TEXT NOT NULL,
  card_id TEXT NOT NULL,
  time_spent_ms INTEGER NOT NULL DEFAULT 0,
  variant_view_count INTEGER NOT NULL DEFAULT 1,
  page_number INTEGER,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_engagement_session ON engagement_events(session_id);
CREATE INDEX idx_engagement_feed ON engagement_events(feed_id);
CREATE INDEX idx_engagement_card ON engagement_events(card_id);
