/**
 * D1 access layer for the `places` table (rich schema from
 * migrations/0003_rich_places.sql). All functions return objects in the
 * shape expected by the frontend (lat/lng coords, tags array, deep_history,
 * tts_hints) — never raw DB rows.
 */

import { NearbyPlace, Place } from "./types";

interface PlaceRow {
  location_id: string;
  name: string;
  category: string | null;
  era: string | null;
  summary: string | null;
  architectural_details: string | null;
  cultural_significance: string | null;
  tags_json: string | null;
  tts_pronunciation: string | null;
  tts_key_facts: string | null;
  lat: number;
  lng: number;
}

const SELECT_COLUMNS =
  "location_id, name, category, era, summary, architectural_details, cultural_significance, tags_json, tts_pronunciation, tts_key_facts, lat, lng";

export async function findAllPlaces(db: D1Database): Promise<Place[]> {
  const { results } = await db
    .prepare(`SELECT ${SELECT_COLUMNS} FROM places`)
    .all<PlaceRow>();
  return (results ?? []).map(rowToPlace);
}

export async function findPlaceByName(
  db: D1Database,
  name: string
): Promise<Place | null> {
  const row = await db
    .prepare(`SELECT ${SELECT_COLUMNS} FROM places WHERE LOWER(name) = LOWER(?) LIMIT 1`)
    .bind(name)
    .first<PlaceRow>();
  return row ? rowToPlace(row) : null;
}

export async function searchPlacesByName(
  db: D1Database,
  query: string,
  limit = 5
): Promise<Place[]> {
  const like = `%${query.replace(/[%_]/g, "")}%`;
  const { results } = await db
    .prepare(
      `SELECT ${SELECT_COLUMNS} FROM places WHERE name LIKE ? COLLATE NOCASE LIMIT ?`
    )
    .bind(like, limit)
    .all<PlaceRow>();
  return (results ?? []).map(rowToPlace);
}

/**
 * Returns the N nearest places to (lat, lon) ordered ascending by distance.
 * SQLite has no haversine built-in, so we compute it in JS over all rows.
 * With ~140 rows this is trivial (< 1 ms).
 */
export async function findNearestPlaces(
  db: D1Database,
  lat: number,
  lng: number,
  limit = 5
): Promise<NearbyPlace[]> {
  const { results } = await db
    .prepare(`SELECT ${SELECT_COLUMNS} FROM places`)
    .all<PlaceRow>();

  const ranked: NearbyPlace[] = (results ?? []).map((row) => {
    const place = rowToPlace(row);
    const distance_km = haversineKm(lat, lng, place.coordinates.lat, place.coordinates.lng);
    return {
      ...place,
      distance_km,
      directions_url: googleDirectionsUrl(
        lat,
        lng,
        place.coordinates.lat,
        place.coordinates.lng
      ),
    };
  });

  ranked.sort((a, b) => a.distance_km - b.distance_km);
  return ranked.slice(0, Math.max(1, limit));
}

// ─────────────────────────────────────────────────────────────────────

function rowToPlace(row: PlaceRow): Place {
  return {
    id: row.location_id,
    name: row.name,
    category: row.category ?? "attraction",
    era: row.era ?? undefined,
    tags: parseTags(row.tags_json),
    coordinates: { lat: row.lat, lng: row.lng },
    deep_history: {
      summary: row.summary ?? "",
      architectural_details: row.architectural_details ?? "",
      cultural_significance: row.cultural_significance ?? "",
    },
    tts_hints: {
      pronunciation_guide: row.tts_pronunciation ?? "",
      key_facts_short: row.tts_key_facts ?? "",
    },
  };
}

function parseTags(json: string | null): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

function googleDirectionsUrl(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${fromLat},${fromLng}&destination=${toLat},${toLng}&travelmode=driving`;
}
