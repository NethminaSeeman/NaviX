import axios from "axios";
import { API_BASE_URL } from "@/utils/constants";
import { normalizeError } from "@/utils/errorHandling";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 12000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(new Error(normalizeError(error)))
);
