import type { Env } from "./index";

export type WeatherResult = {
  temp: number;
  description: string;
};

export async function getWeather(
  env: Env,
  lat: number,
  lon: number
): Promise<WeatherResult> {
  if (!env.WEATHER_API_KEY) {
    return { temp: 28, description: "Partly cloudy (mock)" };
  }

  const url = new URL("https://api.openweathermap.org/data/2.5/weather");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("appid", env.WEATHER_API_KEY);
  url.searchParams.set("units", "metric");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Weather API error: ${res.status}`);

  const data = (await res.json()) as {
    main: { temp: number };
    weather: { description: string }[];
  };

  return {
    temp: data.main.temp,
    description: data.weather[0]?.description ?? "Unknown",
  };
}
