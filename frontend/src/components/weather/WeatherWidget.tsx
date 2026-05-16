"use client";

import { useEffect, useState } from "react";
import { fetchWeather } from "@/services/weather";

type WeatherState = {
  temp?: number;
  description?: string;
  loading: boolean;
  error?: string;
};

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherState>({ loading: true });

  useEffect(() => {
    fetchWeather(7.8731, 80.7718)
      .then((data) =>
        setWeather({
          loading: false,
          temp: data.temp,
          description: data.description,
        })
      )
      .catch((err: Error) =>
        setWeather({ loading: false, error: err.message })
      );
  }, []);

  return (
    <div className="rounded-xl border border-navix-green/20 bg-white p-4 shadow-sm">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-navix-green">
        Weather
      </h2>
      {weather.loading && <p className="text-sm text-gray-500">Loading…</p>}
      {weather.error && (
        <p className="text-sm text-red-600">{weather.error}</p>
      )}
      {!weather.loading && !weather.error && (
        <p className="text-2xl font-semibold">
          {weather.temp != null ? `${Math.round(weather.temp)}°C` : "—"}
          {weather.description && (
            <span className="mt-1 block text-sm font-normal text-gray-600">
              {weather.description}
            </span>
          )}
        </p>
      )}
    </div>
  );
}
