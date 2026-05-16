import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import HeroSection from "@/components/HeroSection";
import SearchBar from "@/components/SearchBar";
import DestinationCard from "@/components/DestinationCard";
import WeatherCard from "@/components/WeatherCard";
import LoadingSpinner from "@/components/LoadingSpinner";
import { featuredDestinations } from "@/utils/mockData";
import { useWeather } from "@/context/WeatherContext";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { ceygoApi } from "@/services/ceygoApi";

const HomePage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [destinations, setDestinations] = useState(featuredDestinations);
  const [loadingDestinations, setLoadingDestinations] = useState(false);
  const { weather, loading } = useWeather();
  const speech = useSpeechRecognition();

  useEffect(() => {
    const loadPlaces = async () => {
      setLoadingDestinations(true);
      try {
        const places = await ceygoApi.places();
        setDestinations(places);
      } finally {
        setLoadingDestinations(false);
      }
    };
    loadPlaces();
  }, []);

  const filteredDestinations = useMemo(
    () =>
      destinations.filter((destination) =>
        `${destination.name} ${destination.district}`
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [search, destinations]
  );

  return (
    <div className="space-y-8">
      <HeroSection
        listening={speech.listening}
        onVoiceStart={speech.startListening}
        onVoiceStop={speech.stopListening}
      />
      <SearchBar
        value={search}
        onChange={setSearch}
        onSubmit={(event) => event.preventDefault()}
      />

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="section-title">Featured Destinations</h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="mono-label text-[11px] text-slate-500 dark:text-cyan-300/80"
          >
            AI-curated places across Sri Lanka
          </motion.p>
        </div>
        {loadingDestinations ? (
          <LoadingSpinner text="Loading destination highlights..." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredDestinations.map((destination, index) => (
              <motion.div
                key={destination.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
              >
                <DestinationCard destination={destination} />
              </motion.div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="section-title">Weather Highlights</h2>
        {loading ? (
          <LoadingSpinner text="Fetching weather intelligence..." />
        ) : (
          <WeatherCard weather={weather} />
        )}
      </section>

      <section className="tech-panel flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <h3 className="text-lg font-semibold">Ready for a guided trip plan?</h3>
          <p className="text-sm text-slate-500">
            Ask NaviX for live route advice, weather-safe schedules, and hidden
            gems.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/chat")}
          className="tech-button"
        >
          Open Assistant
        </button>
      </section>
    </div>
  );
};

export default HomePage;
