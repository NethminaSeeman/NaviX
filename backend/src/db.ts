import type { Env } from "./index";

export type PlaceDocument = {
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

const PLACES_COLLECTION = "places";

async function dataApiRequest(
  env: Env,
  action: string,
  payload: Record<string, unknown>
): Promise<Record<string, unknown> | null> {
  const baseUrl = env.MONGODB_DATA_API_URL;
  const apiKey = env.MONGODB_DATA_API_KEY;
  if (!baseUrl || !apiKey) return null;

  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/action/${action}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      dataSource: env.MONGODB_DATA_SOURCE || "Cluster0",
      database: env.MONGODB_DATABASE || "navix",
      ...payload,
    }),
  });

  if (!res.ok) {
    throw new Error(`MongoDB Data API error: ${res.status}`);
  }

  return (await res.json()) as Record<string, unknown>;
}

export async function findPlaces(env: Env): Promise<PlaceDocument[]> {
  const result = await dataApiRequest(env, "find", {
    collection: PLACES_COLLECTION,
    filter: {},
    limit: 100,
  });

  if (!result) return [];
  const documents = result.documents;
  return Array.isArray(documents) ? (documents as PlaceDocument[]) : [];
}

export async function findNearestHeritage(
  env: Env,
  lat: number,
  lng: number
): Promise<HeritageContext | null> {
  const result = await dataApiRequest(env, "aggregate", {
    collection: PLACES_COLLECTION,
    pipeline: [
      {
        $geoNear: {
          near: { type: "Point", coordinates: [lng, lat] },
          distanceField: "distance_meters",
          maxDistance: 100000,
          spherical: true,
        },
      },
      { $limit: 1 },
    ],
  });

  if (!result) return null;

  const documents = result.documents;
  if (!Array.isArray(documents) || documents.length === 0) return null;

  const doc = documents[0] as PlaceDocument & { distance_meters?: number };
  const rules = doc.cultural_rules;
  const culturalRules = Array.isArray(rules)
    ? rules.join(" ")
    : typeof rules === "string"
      ? rules
      : "";

  return {
    nearest_site: doc.nearest_site || doc.name || "Unknown",
    district: doc.district || "Unknown",
    distance_meters: Math.round(doc.distance_meters ?? 0),
    verified_history: doc.verified_history || "",
    cultural_rules: culturalRules,
  };
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
