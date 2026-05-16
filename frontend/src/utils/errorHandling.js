import { API_BASE_URL } from "@/utils/constants";

const formatDetail = (data) => {
  if (!data) return "";
  if (typeof data === "string") return data;
  if (typeof data.detail === "string") return data.detail;
  if (Array.isArray(data.detail)) {
    return data.detail
      .map((item) =>
        item?.msg ? `${(item.loc || []).join(".")}: ${item.msg}` : JSON.stringify(item)
      )
      .join("; ");
  }
  if (typeof data.error === "string") return data.error;
  if (typeof data.message === "string") return data.message;
  try {
    return JSON.stringify(data);
  } catch {
    return "";
  }
};

export const normalizeError = (error) => {
  if (!error) return "Unexpected error occurred.";

  const status = error.response?.status;
  const detail = formatDetail(error.response?.data);

  if (status && status >= 400 && status < 500) {
    return detail
      ? `Request rejected (${status}): ${detail}`
      : `Request rejected with status ${status}.`;
  }

  if (status && status >= 500) {
    return detail
      ? `NaviX backend error (${status}): ${detail}`
      : `NaviX backend returned status ${status}.`;
  }

  if (
    error.code === "ERR_NETWORK" ||
    error.message === "Network Error" ||
    error.code === "ECONNABORTED"
  ) {
    return `Cannot reach NaviX backend at ${API_BASE_URL}. Is it running?`;
  }

  if (error.message) return error.message;
  return "Something went wrong. Please try again.";
};
