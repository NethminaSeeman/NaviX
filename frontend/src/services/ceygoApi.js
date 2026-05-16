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
    district: place.district || place.region || "Sri Lanka",
    history: place.history || place.description || "Popular travel attraction.",
    image: place.image || featuredDestinations[index % featuredDestinations.length].image,
    duration: place.duration || "2-3 hours",
    tips: Array.isArray(place.tips) ? place.tips : [],
    coordinates: {
      lat: Number(lat),
      lng: Number(lng),
    },
  };
};

export const ceygoApi = {
  chat: async ({ prompt, context }) => {
    const response = await retry(() =>
      apiClient.post("/chat", {
        prompt,
        context,
      })
    );
    const data = response.data;

    return {
      answer:
        data?.answer ||
        data?.response ||
        data?.message ||
        "I am here to help with your Sri Lanka trip.",
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

  nearby: async ({ lat, lng }) => {
    try {
      const { data } = await retry(() =>
        apiClient.get("/nearby", { params: { lat, lng, lon: lng } })
      );
      if (!Array.isArray(data)) return [];

      return data
        .map((place, index) => normalizePlace(place, index))
        .filter(Boolean)
        .map((place) => ({
          ...place,
          distanceKm: distanceKm({ lat, lng }, place.coordinates),
        }))
        .sort((a, b) => a.distanceKm - b.distanceKm);
    } catch (_error) {
      return featuredDestinations
        .map((place) => ({
          ...place,
          distanceKm: distanceKm({ lat, lng }, place.coordinates),
        }))
        .sort((a, b) => a.distanceKm - b.distanceKm);
    }
  },
};
