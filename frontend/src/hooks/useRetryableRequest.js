import { useCallback, useState } from "react";

export const useRetryableRequest = (requestFn, retries = 2) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const execute = useCallback(
    async (...args) => {
      setLoading(true);
      setError("");
      let lastError;

      for (let i = 0; i <= retries; i += 1) {
        try {
          const result = await requestFn(...args);
          setLoading(false);
          return result;
        } catch (err) {
          lastError = err;
        }
      }

      setError(lastError?.message || "Request failed.");
      setLoading(false);
      throw lastError;
    },
    [requestFn, retries]
  );

  return { execute, loading, error };
};
