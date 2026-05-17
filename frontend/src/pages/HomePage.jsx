import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FiGrid, FiMap } from "react-icons/fi";
import ImmersiveHero from "@/components/ImmersiveHero";
import SearchBar from "@/components/SearchBar";
import DestinationCard from "@/components/DestinationCard";
import JourneyMapExplorer from "@/components/JourneyMapExplorer";
import WeatherCard from "@/components/WeatherCard";
import LoadingSpinner from "@/components/LoadingSpinner";
import { featuredDestinations } from "@/utils/mockData";
import { useWeather } from "@/context/WeatherContext";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { ceygoApi } from "@/services/ceygoApi";
import { vibrateLight } from "@/utils/haptics";

const HomePage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [viewMode, setViewMode] = useState("cards");
  const [destinations, setDestinations] = useState(featuredDestinations);
  const [loadingDestinations, setLoadingDestinations] = useState(false);
  const { weather, loading } = useWeather();
  const speech = useSpeechRecognition();
  const wasListeningRef = useRef(false);

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

  useEffect(() => {
    if (!speech.transcript) return;
    setSearch(speech.transcript);
    setActiveSearch(speech.transcript);
  }, [speech.transcript]);

  useEffect(() => {
    const wasListening = wasListeningRef.current;
    wasListeningRef.current = speech.listening;
    if (!wasListening || speech.listening) return;

    const finalQuery = speech.transcript.trim();
    if (!finalQuery) return;

    // Auto-apply voice query, then clear visible input for next command.
    setActiveSearch(finalQuery);
    setViewMode("cards");
    setSearch("");
    speech.setTranscript("");
  }, [speech.listening, speech.transcript, speech.setTranscript]);

  const handleSearchChange = (value) => {
    setSearch(value);
    setActiveSearch(value);
  };

  const filteredDestinations = useMemo(
    () =>
      destinations.filter((destination) =>
        `${destination.name} ${destination.district}`
          .toLowerCase()
          .includes(activeSearch.toLowerCase())
      ),
    [activeSearch, destinations]
  );

  return (
    <div className="space-y-8">
      <ImmersiveHero
        listening={speech.listening}
        voiceSupported={speech.supported}
        onVoiceStart={speech.startListening}
        onVoiceStop={speech.stopListening}
      />
      <SearchBar
        value={search}
        onChange={handleSearchChange}
        onSubmit={(event) => event.preventDefault()}
        suggestions={destinations}
      />

      <section className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div>
            <h2 className="section-title">Featured Destinations</h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="mono-label mt-1 text-[11px] text-slate-500 dark:text-cyan-300/80"
            >
              AI-curated places across Sri Lanka
            </motion.p>
          </div>
          <div
            className="flex rounded-xl border border-slate-200/90 bg-white/70 p-1 shadow-inner dark:border-cyan-500/20 dark:bg-slate-900/60"
            role="tablist"
            aria-label="Choose destination layout"
          >
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "cards"}
              onClick={() => {
                vibrateLight(6);
                setViewMode("cards");
              }}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                viewMode === "cards"
                  ? "bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 shadow-md"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/80"
              }`}
            >
              <FiGrid />
              Cards
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "map"}
              onClick={() => {
                vibrateLight(6);
                setViewMode("map");
              }}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                viewMode === "map"
                  ? "bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 shadow-md"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/80"
              }`}
            >
              <FiMap />
              Journey Map
            </button>
          </div>
        </div>

        {loadingDestinations ? (
          <LoadingSpinner text="Loading destination highlights..." />
        ) : viewMode === "cards" ? (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {filteredDestinations.map((destination) => (
              <DestinationCard key={destination.id} destination={destination} />
            ))}
          </div>
        ) : filteredDestinations.length > 0 ? (
          <JourneyMapExplorer destinations={filteredDestinations} />
        ) : (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-cyan-500/20 dark:text-slate-400">
            No destinations match your search — clear the filter to see the Journey Map.
          </p>
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
            Ask NaviX for live route advice, weather-safe schedules, and hidden gems.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            vibrateLight(12);
            navigate("/chat");
          }}
          className="tech-button"
        >
          Open Assistant
        </button>
      </section>
    </div>
  );
};

export default HomePage;
