ALTER TABLE sections RENAME TO feeds;
ALTER TABLE flows RENAME TO forks;
ALTER TABLE cards RENAME COLUMN section_id TO feed_id;
ALTER TABLE forks RENAME COLUMN section_ids TO feed_ids;
DROP INDEX IF EXISTS idx_cards_section_order;
CREATE INDEX idx_cards_feed_order ON cards(feed_id, "order");
