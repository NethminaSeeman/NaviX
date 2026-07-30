/**
 * Trip Orchestrator — coordinates weather forecasts with tourism recommendations.
 *
 * When a user says "I want to go to Colombo tomorrow", this orchestrator:
 *   1. Detects travel_date and location from intent entities
 *   2. Fetches the forecast for that location + date
 *   3. If rain is forecast, finds alternative locations with better weather
 */

import { searchPlacesByDistrict } from "../db";
import { Env, IntentResult, NearbyPlace, WeatherResponse } from "../types";
import { getWeatherForecast } from "../weather";

/** Approximate center coordinates for Sri Lankan districts / cities. */
const DISTRICT_COORDS: Record<string, { lat: number; lng: number }> = {
  colombo:       { lat: 6.9271, lng: 79.8612 },
  kandy:         { lat: 7.2906, lng: 80.6337 },
  galle:         { lat: 6.0535, lng: 80.2210 },
  matara:        { lat: 5.9549, lng: 80.5550 },
  jaffna:        { lat: 9.6615, lng: 80.0255 },
  trincomalee:   { lat: 8.5874, lng: 81.2152 },
  anuradhapura:  { lat: 8.3114, lng: 80.4037 },
  polonnaruwa:   { lat: 7.9403, lng: 81.0003 },
  sigiriya:      { lat: 7.9570, lng: 80.7603 },
  ella:          { lat: 6.8754, lng: 81.0465 },
  negombo:       { lat: 7.2096, lng: 79.8380 },
  bentota:       { lat: 6.4262, lng: 79.9994 },
  "nuwara eliya": { lat: 6.9497, lng: 80.7891 },
  dambulla:      { lat: 7.8568, lng: 80.6491 },
  hikkaduwa:     { lat: 6.1395, lng: 80.1037 },
  unawatuna:     { lat: 6.0107, lng: 80.2494 },
  mirissa:       { lat: 5.9453, lng: 80.4546 },
  tangalle:      { lat: 6.0243, lng: 80.7946 },
  weligama:      { lat: 5.9740, lng: 80.4292 },
  hambantota:    { lat: 6.1429, lng: 81.1212 },
  badulla:       { lat: 6.9934, lng: 81.0550 },
  ratnapura:     { lat: 6.6828, lng: 80.3992 },
  kurunegala:    { lat: 7.4863, lng: 80.3647 },
};

export interface OrchestratorResult {
  trip_planning: true;
  target_location: string;
  travel_date: string;
  target_forecast: {
    temperature: number;
    humidity: number;
    condition: string;
    rain: boolean;
    safety_hints: string[];
  };
  weather_is_bad: boolean;
  alternatives: Array<{
    location: string;
    forecast: { temperature: number; condition: string; rain: boolean };
    top_attractions: string[];
  }>;
}

export async function runTripOrchestrator(
  env: Env,
  query: string,
  intent: IntentResult,
  nearby: NearbyPlace[]
): Promise<Record<string, unknown> | null> {
  const travelDate = extractTravelDate(intent);
  const locationName = extractLocation(intent);

  if (!travelDate || !locationName) return null;

  const coords = resolveCoords(locationName, nearby);
  if (!coords) return null;

  // Fetch forecast for target
  let forecast: WeatherResponse;
  try {
    forecast = await getWeatherForecast(env, coords.lat, coords.lng, travelDate);
  } catch {
    return null;
  }

  const result: OrchestratorResult = {
    trip_planning: true,
    target_location: locationName,
    travel_date: travelDate,
    target_forecast: {
      temperature: forecast.temperature,
      humidity: forecast.humidity,
      condition: forecast.condition,
      rain: forecast.rain,
      safety_hints: forecast.safety_hints,
    },
    weather_is_bad: forecast.rain,
    alternatives: [],
  };

  // If bad weather, find sunny alternatives
  if (forecast.rain) {
    result.alternatives = await findSunnyAlternatives(
      env, locationName, travelDate
    );
  }

  return result as unknown as Record<string, unknown>;
}

// ── Helpers ──

function extractTravelDate(intent: IntentResult): string | null {
  const entities = intent.entities ?? {};
  const raw = entities.travel_date;
  if (!raw || typeof raw !== "string") return null;

  const lower = raw.toLowerCase().trim();
  const now = new Date();

  if (lower === "today") {
    return now.toISOString().slice(0, 10);
  }
  if (lower === "tomorrow") {
    return new Date(now.getTime() + 86400000).toISOString().slice(0, 10);
  }
  if (lower === "this weekend") {
    const daysToSat = (6 - now.getDay() + 7) % 7 || 7;
    return new Date(now.getTime() + daysToSat * 86400000).toISOString().slice(0, 10);
  }
  if (lower === "next week") {
    return new Date(now.getTime() + 7 * 86400000).toISOString().slice(0, 10);
  }
  // Try ISO parse
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);

  // Fallback to tomorrow
  return new Date(now.getTime() + 86400000).toISOString().slice(0, 10);
}

function extractLocation(intent: IntentResult): string | null {
  const entities = intent.entities ?? {};
  for (const key of ["location", "district", "city", "place", "destination"]) {
    const v = entities[key];
    if (typeof v === "string" && v.trim().length > 1) return v.trim();
  }
  return null;
}

function resolveCoords(
  name: string,
  nearby: NearbyPlace[]
): { lat: number; lng: number } | null {
  const key = name.toLowerCase().trim();
  if (DISTRICT_COORDS[key]) return DISTRICT_COORDS[key];

  for (const p of nearby) {
    if (p.name.toLowerCase().includes(key)) return p.coordinates;
  }
  return null;
}

async function findSunnyAlternatives(
  env: Env,
  excludeLocation: string,
  travelDate: string,
  maxAlts = 3
): Promise<OrchestratorResult["alternatives"]> {
  const excludeKey = excludeLocation.toLowerCase().trim();
  const candidates = [
    "kandy", "galle", "sigiriya", "ella", "negombo",
    "trincomalee", "anuradhapura", "nuwara eliya",
  ];

  const alts: OrchestratorResult["alternatives"] = [];

  for (const name of candidates) {
    if (name === excludeKey) continue;
    const coords = DISTRICT_COORDS[name];
    if (!coords) continue;

    let forecast: WeatherResponse;
    try {
      forecast = await getWeatherForecast(env, coords.lat, coords.lng, travelDate);
    } catch {
      continue;
    }

    if (!forecast.rain) {
      // Get top attractions from D1 if available
      let topAttractions: string[] = [];
      if (env.DB) {
        try {
          const places = await searchPlacesByDistrict(env.DB, name, 3);
          topAttractions = places.map((p) => p.name);
        } catch {
          topAttractions = [];
        }
      }

      alts.push({
        location: capitalize(name),
        forecast: {
          temperature: forecast.temperature,
          condition: forecast.condition,
          rain: forecast.rain,
        },
        top_attractions: topAttractions,
      });

      if (alts.length >= maxAlts) break;
    }
  }

  return alts;
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
