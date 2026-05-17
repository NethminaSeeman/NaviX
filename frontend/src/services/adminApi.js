import { apiClient } from "@/services/apiClient";

export const adminApi = {
  async listUsers({ query = "", status = "all", limit = 25, offset = 0 } = {}) {
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    if (status && status !== "all") params.set("status", status);
    params.set("limit", String(limit));
    params.set("offset", String(offset));

    const qs = params.toString();
    const { data } = await apiClient.get(`/admin/users${qs ? `?${qs}` : ""}`);
    return {
      total: Number(data?.total ?? 0),
      limit: Number(data?.limit ?? limit),
      offset: Number(data?.offset ?? offset),
      users: Array.isArray(data?.data) ? data.data : [],
    };
  },

  async updateUser(userId, patch) {
    const { data } = await apiClient.patch(`/admin/users/${encodeURIComponent(userId)}`, patch);
    return data?.user ?? null;
  },
};
