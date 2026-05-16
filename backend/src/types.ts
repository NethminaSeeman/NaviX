/**
 * Cross-cutting types for the NaviX Worker.
 * Kept dependency-free so they can be imported by every module.
 */

export interface Env {
  DB?: D1Database;
  OPENAI_API_KEY?: string;
  GEMINI_API_KEY?: string;
  WEATHER_API_KEY?: string;
}

export type IntentCategory =
  | "HISTORY"
  | "ROUTE"
  | "FOOD"
  | "WEATHER"
  | "BEACH"
  | "CULTURE"
  | "GENERAL";

export interface IntentResult {
  intent: IntentCategory;
  confidence: number;
  entities: Record<string, unknown>;
  needs_weather: boolean;
  needs_nearby: boolean;
}

export interface DeepHistory {
  summary: string;
  architectural_details: string;
  cultural_significance: string;
}

export interface TtsHints {
  pronunciation_guide: string;
  key_facts_short: string;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Place {
  id: string;
  name: string;
  category: string;
  era?: string;
  tags: string[];
  coordinates: Coordinates;
  deep_history: DeepHistory;
  tts_hints: TtsHints;
}

export interface NearbyPlace extends Place {
  distance_km: number;
  directions_url?: string;
}

export interface WeatherResponse {
  temperature: number;
  humidity: number;
  condition: string;
  rain: boolean;
  safety_hints: string[];
}

export interface ChatRequest {
  query?: string;
  prompt?: string; // legacy alias for `query`
  lat?: number;
  lon?: number;
  lng?: number; // tolerated alias for `lon`
  context?: unknown;
}

export interface ChatResponse {
  answer: string;
  voice_script: string;
  intent: IntentResult;
  weather: WeatherResponse | null;
  nearby: NearbyPlace[];
  matched_location_coordinates: Coordinates | null;
}

/** Thrown by services / agents; mapped to a JSON HTTP response in index.ts */
export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
