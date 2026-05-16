import { apiClient } from "@/services/apiClient";
import { featuredDestinations } from "@/utils/mockData";
import { distanceKm } from "@/utils/geo";

const retry = async (requestFn, retries = 2) => {
  let currentError;
  for (let i = 0; i <= retries; i += 1) {
    try {
      return await requestFn();
    } catch (error) {
      currentError = error;
      if (i === retries) throw currentError;
    }
  }
  throw currentError;
};

const normalizePlace = (place, index) => {
  const lat =
    place?.coordinates?.lat ?? place?.lat ?? place?.latitude ?? place?.location?.lat;
  const lng =
    place?.coordinates?.lng ??
    place?.lng ??
    place?.lon ??
    place?.longitude ??
    place?.location?.lng;

  if (Number.isNaN(Number(lat)) || Number.isNaN(Number(lng))) return null;

  return {
    id: place.id || `${place.name || "place"}-${index}`,
    name: place.name || "Unknown attraction",
    province: place.province || null,
    district: place.district || place.region || "Sri Lanka",
    history: place.history || place.description || "Popular travel attraction.",
    image: place.image || featuredDestinations[index % featuredDestinations.length].image,
    duration: place.duration || "2-3 hours",
    tips: Array.isArray(place.tips) ? place.tips : [],
    tags: Array.isArray(place.tags) ? place.tags : [],
    deep_history: {
      summary:
        place?.deep_history?.summary ||
        place?.summary ||
        place.history ||
        place.description ||
        "A notable Sri Lankan attraction with cultural value.",
      architectural_details:
        place?.deep_history?.architectural_details ||
        place?.architectural_details ||
        "Architectural details currently unavailable.",
    },
    tts_hints: {
      key_facts_short:
        place?.tts_hints?.key_facts_short ||
        place?.key_facts_short ||
        `${place.name || "This destination"} is a must-visit attraction in Sri Lanka.`,
      pronunciation_guide:
        place?.tts_hints?.pronunciation_guide ||
        place?.pronunciation_guide ||
        "",
    },
    coordinates: {
      lat: Number(lat),
      lng: Number(lng),
    },
  };
};

export const ceygoApi = {
  chat: async ({ prompt, location, context }) => {
    const payload = { query: prompt };
    if (location?.lat != null && (location?.lng != null || location?.lon != null)) {
      payload.lat = Number(location.lat);
      payload.lon = Number(location.lng ?? location.lon);
    }
    if (context !== undefined) payload.context = context;

    const response = await retry(() => apiClient.post("/chat", payload));
    const data = response.data;

    return {
      answer:
        data?.answer ||
        data?.response ||
        data?.message ||
        "I am here to help with your Sri Lanka trip.",
      voiceScript: data?.voice_script,
      intent: data?.intent,
      weather: data?.weather,
      nearby: data?.nearby || [],
      matchedLocation: data?.matched_location_coordinates,
    };
  },

  weather: async ({ lat, lon }) => {
    const response = await retry(() =>
      apiClient.get("/weather", {
        params: { lat, lon },
      })
    );
    const data = response.data;

    return {
      temperature: Math.round(data?.temperature ?? data?.temp ?? 28),
      humidity: data?.humidity ?? 74,
      rainChance: data?.rainChance ?? 30,
      description: data?.description ?? "Partly cloudy",
    };
  },

  places: async () => {
    try {
      const { data } = await retry(() => apiClient.get("/places"));
      const places = Array.isArray(data)
        ? data
            .map((place, index) => normalizePlace(place, index))
            .filter(Boolean)
        : [];
      return places.length > 0 ? places : featuredDestinations;
    } catch (_error) {
      return featuredDestinations;
    }
  },

  nearby: async ({ lat, lng, radius = 50000, limit = 500 }) => {
    const params = { lat, lng, lon: lng, radius, limit };

    // Support both backend route shapes (/nearby and /api/nearby) across environments.
    let data;
    try {
      ({ data } = await retry(() => apiClient.get("/nearby", { params })));
    } catch (firstError) {
      try {
        ({ data } = await retry(() => apiClient.get("/api/nearby", { params })));
      } catch {
        throw firstError;
      }
    }

    const payload = Array.isArray(data) ? data : data?.data;
    if (!Array.isArray(payload)) return [];

    return payload
      .map((place, index) => normalizePlace(place, index))
      .filter(Boolean)
      .map((place) => ({
        ...place,
        distanceKm: distanceKm({ lat, lng }, place.coordinates),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm);
  },
};
