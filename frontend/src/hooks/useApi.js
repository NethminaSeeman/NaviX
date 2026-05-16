import { useEffect, useState } from "react";

export const useApi = (requestFn, deps = [], immediate = true) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState("");

  const run = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await requestFn();
      setData(result);
      return result;
    } catch (err) {
      setError(err?.message || "Failed to load data.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!immediate) return;
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, setData, loading, error, run };
};
