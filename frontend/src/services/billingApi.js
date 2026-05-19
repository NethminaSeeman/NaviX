import { apiClient } from "@/services/apiClient";

export const billingApi = {
  /**
   * Creates a Stripe Checkout Session for the chosen plan and returns the URL
   * the caller should send the browser to.
   * @param {'monthly'|'yearly'} plan
   */
  async startCheckout(plan) {
    const { data } = await apiClient.post("/billing/checkout", { plan });
    if (!data?.url) throw new Error("Backend did not return a checkout URL.");
    return data.url;
  },

  async openPortal() {
    const { data } = await apiClient.post("/billing/portal");
    if (!data?.url) throw new Error("Backend did not return a portal URL.");
    return data.url;
  },

  async getStatus() {
    const { data } = await apiClient.get("/billing/status");
    return data ?? null;
  },
};
