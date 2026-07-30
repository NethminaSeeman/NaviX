import { Env, NearbyPlace, Place } from "./types";

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

export type NearbyLocation = {
  id: string;
  name: string;
  longitude: number;
  latitude: number;
  category: string | null;
  era: string | null;
  deep_history: unknown;
  tags: unknown;
  tts_hints: unknown;
  distance_meters: number;
  distance_km?: number;
};

const SELECT_COLUMNS =
  "location_id, name, category, era, summary, architectural_details, cultural_significance, tags_json, tts_pronunciation, tts_key_facts, lat, lng";

function parseJsonField<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

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
  const cleaned = query.replace(/[^\w\s-]/g, " ").replace(/\s+/g, " ").trim();
  if (cleaned.length < 2) return [];
  const needle = cleaned.slice(0, 96);
  const safeLimit = Math.min(Math.max(1, Math.floor(limit)), 20);

  const { results } = await db
    .prepare(
      `
      SELECT ${SELECT_COLUMNS}
      FROM places
      WHERE INSTR(LOWER(name), LOWER(?1)) > 0
      ORDER BY CASE WHEN LOWER(name) = LOWER(?2) THEN 0 ELSE 1 END, LENGTH(name) ASC
      LIMIT ?3
      `
    )
    .bind(needle, needle, safeLimit)
    .all<PlaceRow>();
  return (results ?? []).map(rowToPlace);
}

/**
 * Search for places related to a district/city name.
 * Searches across name, tags_json, and summary columns.
 */
export async function searchPlacesByDistrict(
  db: D1Database,
  district: string,
  limit = 10
): Promise<NearbyPlace[]> {
  const like = `%${district.replace(/[%_]/g, "")}%`;
  const { results } = await db
    .prepare(
      `SELECT ${SELECT_COLUMNS} FROM places
       WHERE name LIKE ?1 COLLATE NOCASE
          OR tags_json LIKE ?1 COLLATE NOCASE
          OR summary LIKE ?1 COLLATE NOCASE
          OR cultural_significance LIKE ?1 COLLATE NOCASE
       LIMIT ?2`
    )
    .bind(like, limit)
    .all<PlaceRow>();

  return (results ?? []).map((row) => {
    const place = rowToPlace(row);
    return {
      ...place,
      distance_km: 0,
      directions_url: undefined,
    };
  });
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

/**
 * Returns places within radiusMeters of (lat, lng), nearest first.
 * Uses the `places` table (D1 schema) — not the legacy heritage_locations name.
 */
export async function findNearbyLocations(
  env: Env,
  lat: number,
  lng: number,
  radiusMeters: number,
  limit = 50
): Promise<NearbyLocation[]> {
  if (!env.DB) return [];

  const safeRadius = Math.max(1, radiusMeters);
  const safeLimit = Math.min(Math.max(1, Math.floor(limit)), 500);
  const radiusKm = safeRadius / 1000;

  const { results } = await env.DB.prepare(
    `SELECT ${SELECT_COLUMNS} FROM places`
  ).all<PlaceRow>();

  const ranked: NearbyLocation[] = (results ?? [])
    .map((row) => {
      const place = rowToPlace(row);
      const distance_km = haversineKm(
        lat,
        lng,
        place.coordinates.lat,
        place.coordinates.lng
      );
      return {
        id: place.id,
        name: place.name,
        longitude: place.coordinates.lng,
        latitude: place.coordinates.lat,
        category: place.category,
        era: place.era ?? null,
        deep_history: place.deep_history,
        tags: place.tags,
        tts_hints: place.tts_hints,
        distance_meters: Math.round(distance_km * 1000),
        distance_km,
      };
    })
    .filter((row) => row.distance_km <= radiusKm);

  ranked.sort((a, b) => a.distance_meters - b.distance_meters);
  return ranked.slice(0, safeLimit);
}

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

function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string");
    }
  } catch {
    // Ignore parse failures and fall back below.
  }
  return [];
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
