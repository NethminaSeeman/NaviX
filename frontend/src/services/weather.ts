import { apiFetch } from "./api";

export type WeatherResponse = {
  temp: number;
  description: string;
};

export function fetchWeather(lat: number, lon: number) {
  return apiFetch<WeatherResponse>(`/api/weather?lat=${lat}&lon=${lon}`);
}
