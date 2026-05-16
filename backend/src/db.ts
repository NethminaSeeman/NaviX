import type { Env } from "./index";

export type PlaceDocument = {
  id?: number;
  name?: string;
  nearest_site?: string;
  district?: string;
  verified_history?: string;
  cultural_rules?: string | string[];
  location?: { type: string; coordinates: [number, number] };
  coordinates?: { lat: number; lng: number };
};

export type HeritageContext = {
  nearest_site: string;
  district: string;
  distance_meters: number;
  verified_history: string;
  cultural_rules: string;
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

type PlaceRow = {
  id: number;
  name: string;
  nearest_site: string | null;
  district: string | null;
  verified_history: string | null;
  cultural_rules: string | null;
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

function parseCulturalRules(rules: string | null): string | string[] {
  if (!rules) return "";
  try {
    const parsed = JSON.parse(rules) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string");
    }
  } catch {
    // Keep original string value when not JSON.
  }
  return rules;
}

function mapRowToPlace(row: PlaceRow): PlaceDocument {
  const parsedRules = parseCulturalRules(row.cultural_rules);
  return {
    id: row.id,
    name: row.name,
    nearest_site: row.nearest_site ?? row.name,
    district: row.district ?? "Unknown",
    verified_history: row.verified_history ?? "",
    cultural_rules: parsedRules,
    coordinates: { lat: row.lat, lng: row.lng },
    location: { type: "Point", coordinates: [row.lng, row.lat] },
  };
}

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

export async function findPlaces(env: Env): Promise<PlaceDocument[]> {
  if (!env.DB) return [];

  const result = await env.DB.prepare(
    `
      SELECT id, name, nearest_site, district, verified_history, cultural_rules, lat, lng
      FROM places
      ORDER BY id ASC
      LIMIT 100
    `
  ).all<PlaceRow>();

  return (result.results ?? []).map(mapRowToPlace);
}

export async function findNearestHeritage(
  env: Env,
  lat: number,
  lng: number
): Promise<HeritageContext | null> {
  if (!env.DB) return null;

  const maxDistanceMeters = 100000;
  const earthMetersPerDegree = 111320;
  const latDelta = maxDistanceMeters / earthMetersPerDegree;
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const lngDelta =
    maxDistanceMeters / (earthMetersPerDegree * Math.max(Math.abs(cosLat), 0.1));

  const candidatesResult = await env.DB.prepare(
    `
      SELECT p.id, p.name, p.nearest_site, p.district, p.verified_history, p.cultural_rules, p.lat, p.lng
      FROM places p
      WHERE p.lat BETWEEN ?1 AND ?2
        AND p.lng BETWEEN ?3 AND ?4
      LIMIT 250
    `
  )
    .bind(lat - latDelta, lat + latDelta, lng - lngDelta, lng + lngDelta)
    .all<PlaceRow>();

  const candidates = candidatesResult.results ?? [];
  if (candidates.length === 0) return null;

  let nearest: (PlaceRow & { distance_meters: number }) | null = null;
  for (const row of candidates) {
    const distanceMeters = Math.round(haversineKm(lat, lng, row.lat, row.lng) * 1000);
    if (distanceMeters > maxDistanceMeters) continue;
    if (!nearest || distanceMeters < nearest.distance_meters) {
      nearest = { ...row, distance_meters: distanceMeters };
    }
  }

  if (!nearest) return null;

  const rules = parseCulturalRules(nearest.cultural_rules);
  const culturalRules = Array.isArray(rules)
    ? rules.join(" ")
    : rules;

  return {
    nearest_site: nearest.nearest_site || nearest.name || "Unknown",
    district: nearest.district || "Unknown",
    distance_meters: nearest.distance_meters,
    verified_history: nearest.verified_history || "",
    cultural_rules: culturalRules,
  };
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
  const safeLimit = Math.min(Math.max(1, Math.floor(limit)), 200);

  // Fast bounding-box prefilter to reduce expensive trig operations.
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

export function toNearbyResponse(
  places: PlaceDocument[],
  lat: number,
  lng: number
): Array<PlaceDocument & { distanceKm: number }> {
  return places
    .map((place) => {
      const coords = place.coordinates ?? {
        lat: place.location?.coordinates?.[1] ?? 0,
        lng: place.location?.coordinates?.[0] ?? 0,
      };
      const distanceKm = haversineKm(lat, lng, coords.lat, coords.lng);
      return { ...place, distanceKm };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
