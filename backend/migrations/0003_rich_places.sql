-- 0003_rich_places.sql
-- Replace the minimal places table with the rich schema that matches
-- the 138-location dataset (data/production_srilanka_db.json) and the
-- frontend feature set (info windows, voice TTS hints, category tags).

DROP TABLE IF EXISTS places;

CREATE TABLE places (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  location_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  era TEXT,
  summary TEXT,
  architectural_details TEXT,
  cultural_significance TEXT,
  tags_json TEXT,
  tts_pronunciation TEXT,
  tts_key_facts TEXT,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK(lat >= -90 AND lat <= 90),
  CHECK(lng >= -180 AND lng <= 180)
);

CREATE INDEX idx_places_lat_lng ON places(lat, lng);
CREATE INDEX idx_places_category ON places(category);
CREATE INDEX idx_places_name ON places(name);
