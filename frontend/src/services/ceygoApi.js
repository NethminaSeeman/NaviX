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

export const ceygoApi = {
  chat: async ({ prompt, context }) => {
    let data;

    try {
      const response = await retry(() =>
        apiClient.post("/chat", {
          message: prompt,
          prompt,
          context,
        })
      );
      data = response.data;
    } catch (_error) {
      const response = await retry(() =>
        apiClient.post("/api/ask", {
          prompt,
          context,
        })
      );
      data = response.data;
    }

    return {
      answer:
        data?.answer ||
        data?.response ||
        data?.message ||
        "I am here to help with your Sri Lanka trip.",
    };
  },

  weather: async ({ lat, lon }) => {
    let data;

    try {
      const response = await retry(() =>
        apiClient.get("/weather", {
          params: { lat, lon },
        })
      );
      data = response.data;
    } catch (_error) {
      const response = await retry(() =>
        apiClient.get("/api/weather", {
          params: { lat, lon },
        })
      );
      data = response.data;
    }

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
      return Array.isArray(data) ? data : featuredDestinations;
    } catch (_error) {
      return featuredDestinations;
    }
  },

  nearby: async ({ lat, lng }) => {
    try {
      const { data } = await retry(() =>
        apiClient.get("/nearby", { params: { lat, lng, lon: lng } })
      );
      return Array.isArray(data) ? data : [];
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
