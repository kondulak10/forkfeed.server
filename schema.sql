CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY DEFAULT 'manifest',
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  version TEXT NOT NULL,
  maintainer_name TEXT NOT NULL,
  maintainer_url TEXT,
  maintainer_email TEXT,
  max_page_size INTEGER NOT NULL DEFAULT 50
);

CREATE TABLE IF NOT EXISTS feeds (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_src TEXT NOT NULL,
  supported_modes TEXT NOT NULL DEFAULT '["sequential"]',
  scroll_direction TEXT NOT NULL DEFAULT 'vertical',
  generator_id TEXT,
  engagement INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,
  feed_id TEXT NOT NULL, -- referential integrity enforced at application layer (D1 does not enable PRAGMA foreign_keys)
  "order" INTEGER NOT NULL DEFAULT 0,
  variants TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_cards_feed_order ON cards(feed_id, "order");

CREATE TABLE IF NOT EXISTS forks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_src TEXT NOT NULL,
  feed_ids TEXT NOT NULL DEFAULT '[]',
  action_label TEXT,
  action_url TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

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
CREATE INDEX IF NOT EXISTS idx_engagement_session ON engagement_events(session_id);
CREATE INDEX IF NOT EXISTS idx_engagement_feed ON engagement_events(feed_id);
CREATE INDEX IF NOT EXISTS idx_engagement_card ON engagement_events(card_id);
CREATE INDEX IF NOT EXISTS idx_engagement_feed_session ON engagement_events(feed_id, session_id);
