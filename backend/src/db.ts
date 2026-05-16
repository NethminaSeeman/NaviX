import type { Env } from "./index";

/**
 * MongoDB helpers — wire up with the official driver or
 * MongoDB Data API / Atlas App Services for Workers compatibility.
 */
export async function connectDb(env: Env): Promise<void> {
  if (!env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not configured");
  }
  // TODO: initialize MongoDB client (e.g. via fetch-based Data API)
}

export async function findPlaces(
  _env: Env,
  _query: Record<string, unknown>
): Promise<unknown[]> {
  // TODO: query places collection
  return [];
}
