import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { FiClock, FiVolume2 } from "react-icons/fi";
import { featuredDestinations } from "@/utils/mockData";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { useWeather } from "@/context/WeatherContext";
import WeatherCard from "@/components/WeatherCard";
import { ceygoApi } from "@/services/ceygoApi";

const DestinationDetailsPage = () => {
  const { id } = useParams();
  const { speak } = useSpeechSynthesis();
  const { weather } = useWeather();
  const [destinations, setDestinations] = useState(featuredDestinations);

  useEffect(() => {
    const loadPlaces = async () => {
      try {
        const places = await ceygoApi.places();
        if (places.length > 0) setDestinations(places);
      } catch (_error) {
        // Keep local data fallback.
      }
    };
    loadPlaces();
  }, []);

  const destination = useMemo(
    () => destinations.find((item) => item.id === id) || destinations[0],
    [id, destinations]
  );

  return (
    <section className="space-y-5">
      <img
        src={destination.image}
        alt={destination.name}
        className="h-72 w-full rounded-3xl object-cover md:h-96"
      />
      <div className="glass-card space-y-4 p-5">
        <h1 className="section-title">{destination.name}</h1>
        <p className="text-sm text-slate-600 dark:text-slate-200">
          {destination.history}
        </p>
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <FiClock /> Estimated visit duration: {destination.duration}
        </div>
        <div>
          <h3 className="font-semibold">Travel Tips</h3>
          <ul className="list-disc pl-5 text-sm text-slate-600 dark:text-slate-200">
            {destination.tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </div>
        <button
          type="button"
          onClick={() => speak(destination)}
          className="inline-flex items-center gap-2 rounded-md border border-cyan-500/40 bg-gradient-to-r from-cyan-500 to-teal-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm active:scale-95"
        >
          <FiVolume2 />
          Play Audio Narration
        </button>
      </div>
      <WeatherCard weather={weather} />
    </section>
  );
};

export default DestinationDetailsPage;
