/**
 * Cross-cutting types for the NaviX Worker.
 * Kept dependency-free so they can be imported by every module.
 */

export interface Env {
  DB?: D1Database;

  // LLM + weather
  OPENAI_API_KEY?: string;
  GEMINI_API_KEY?: string;
  WEATHER_API_KEY?: string;

  // Auth
  GOOGLE_CLIENT_ID?: string;
  ADMIN_BOOTSTRAP_TOKEN?: string;

  // Stripe
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_MONTHLY?: string;
  STRIPE_PRICE_YEARLY?: string;

  // Used to build Stripe success/cancel redirect URLs back to the frontend
  APP_BASE_URL?: string;
}

// ─────────────────────────────────────────────────────────────────────
// Auth + billing

export interface User {
  id: string;
  email: string;
  name: string | null;
  is_admin: boolean;
  account_status: AccountStatus;
  trial_ends_at: string; // ISO timestamp
  created_at: string;
  has_password: boolean;
  has_google: boolean;
}

export type AccountStatus = "active" | "suspended";

export type SubscriptionPlan = "monthly" | "yearly";
export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete";

export interface Subscription {
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: SubscriptionPlan | null;
  status: SubscriptionStatus;
  current_period_end: string | null;
  updated_at: string;
}

export interface AuthSession {
  user: User;
  subscription: Subscription | null;
}

export interface AccessSummary {
  allowed: boolean;
  is_paid: boolean;
  is_trial: boolean;
  trial_days_left: number;
  trial_ends_at: string;
  plan: SubscriptionPlan | null;
  status: SubscriptionStatus | "expired" | "none";
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
