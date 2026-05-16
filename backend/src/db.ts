import { Env, NearbyPlace, Place } from "./types";

type PlaceRow = {
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
};

type NearbyRow = {
  id: string;
  name: string;
  longitude: number;
  latitude: number;
  category: string | null;
  era: string | null;
  deep_history: string | null;
  tags: string | null;
  tts_hints: string | null;
  distance_meters: number;
};

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

function mapNearbyRow(row: NearbyRow): NearbyLocation {
  return {
    id: row.id,
    name: row.name,
    longitude: row.longitude,
    latitude: row.latitude,
    category: row.category,
    era: row.era,
    deep_history: parseJsonField(row.deep_history, null),
    tags: parseJsonField(row.tags, [] as unknown[]),
    tts_hints: parseJsonField(row.tts_hints, null),
    distance_meters: row.distance_meters,
  };
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
  const like = `%${query.replace(/[%_]/g, "")}%`;
  const { results } = await db
    .prepare(`SELECT ${SELECT_COLUMNS} FROM places WHERE name LIKE ? COLLATE NOCASE LIMIT ?`)
    .bind(like, limit)
    .all<PlaceRow>();
  return (results ?? []).map(rowToPlace);
}

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
  const earthMetersPerDegree = 111320;
  const latDelta = safeRadius / earthMetersPerDegree;
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const lngDelta =
    safeRadius / (earthMetersPerDegree * Math.max(Math.abs(cosLat), 0.1));

  const rad = 0.017453292519943295;
  const query = `
    SELECT
      id,
      name,
      longitude,
      latitude,
      category,
      era,
      deep_history,
      tags,
      tts_hints,
      distance_meters
    FROM (
      SELECT
        id,
        name,
        longitude,
        latitude,
        category,
        era,
        deep_history,
        tags,
        tts_hints,
        (
          2 * 6371000 * ASIN(
            SQRT(
              POW(SIN(((?1 - latitude) * ${rad}) / 2), 2) +
              COS(latitude * ${rad}) * COS(?1 * ${rad}) *
              POW(SIN(((?2 - longitude) * ${rad}) / 2), 2)
            )
          )
        ) AS distance_meters
      FROM heritage_locations
      WHERE latitude BETWEEN ?3 AND ?4
        AND longitude BETWEEN ?5 AND ?6
    )
    WHERE distance_meters <= ?7
    ORDER BY distance_meters ASC
    LIMIT ?8
  `;

  const result = await env.DB.prepare(query)
    .bind(
      lat,
      lng,
      lat - latDelta,
      lat + latDelta,
      lng - lngDelta,
      lng + lngDelta,
      safeRadius,
      safeLimit
    )
    .all<NearbyRow>();

  return (result.results ?? []).map(mapNearbyRow);
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

function haversineKm(
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
