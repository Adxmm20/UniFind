-- UniFind schema, ported from the MySQL/MariaDB dump (unifind.sql) to SQLite.
-- Type mapping: int(11)->INTEGER, tinyint(1)->INTEGER, datetime/timestamp->TEXT,
-- decimal(10,2)->REAL, AUTO_INCREMENT->INTEGER PRIMARY KEY AUTOINCREMENT.
-- The MySQL json_valid() CHECK on items.images is dropped (stored as TEXT).

PRAGMA foreign_keys = ON;

CREATE TABLE users (
  email         TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  phone_number  TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE events (
  event_id             INTEGER PRIMARY KEY AUTOINCREMENT,
  organizer_email      TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  title                TEXT NOT NULL,
  description          TEXT NOT NULL,
  category             TEXT NOT NULL,
  venue_name           TEXT NOT NULL,
  start_time           TEXT NOT NULL,
  end_time             TEXT NOT NULL,
  star_points_eligible INTEGER NOT NULL DEFAULT 0,
  banner_image_url     TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_events_organizer ON events(organizer_email);

CREATE TABLE items (
  item_id           INTEGER PRIMARY KEY AUTOINCREMENT,
  provider_email    TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  description       TEXT NOT NULL,
  item_type         TEXT NOT NULL CHECK (item_type IN ('rent', 'service')),
  category          TEXT NOT NULL,
  price             REAL NOT NULL,
  price_unit        TEXT DEFAULT 'flat_rate',
  location_coverage TEXT,
  images            TEXT,
  is_available      INTEGER NOT NULL DEFAULT 1,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_items_provider ON items(provider_email);

CREATE TABLE event_rsvps (
  rsvp_id       INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id      INTEGER NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
  user_email    TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  registered_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (event_id, user_email)
);
CREATE INDEX idx_rsvps_user ON event_rsvps(user_email);

CREATE TABLE bookmarks (
  bookmark_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_email  TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  event_id    INTEGER REFERENCES events(event_id) ON DELETE CASCADE,
  item_id     INTEGER REFERENCES items(item_id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_bookmarks_user ON bookmarks(user_email);

CREATE TABLE reviews (
  review_id      INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id        INTEGER NOT NULL REFERENCES items(item_id) ON DELETE CASCADE,
  reviewer_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  rating         INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment        TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_reviews_item ON reviews(item_id);
