import { FiCloudRain, FiDroplet, FiThermometer } from "react-icons/fi";

const WeatherCard = ({ weather }) => {
  if (!weather) return null;

  return (
    <div className="tech-panel p-4 md:p-5">
      <h3 className="mono-label mb-3 text-[11px] text-slate-500 dark:text-cyan-300/80">
        Weather_Aware_Insights
      </h3>
      <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
        <p className="flex items-center gap-2 rounded-md border border-slate-200 bg-white/60 p-2 dark:border-slate-700 dark:bg-slate-800/60">
          <FiThermometer className="text-ceygo-secondary" />
          {weather.temperature} C
        </p>
        <p className="flex items-center gap-2 rounded-md border border-slate-200 bg-white/60 p-2 dark:border-slate-700 dark:bg-slate-800/60">
          <FiDroplet className="text-ceygo-secondary" />
          {weather.humidity}% humidity
        </p>
        <p className="flex items-center gap-2 rounded-md border border-slate-200 bg-white/60 p-2 dark:border-slate-700 dark:bg-slate-800/60">
          <FiCloudRain className="text-ceygo-secondary" />
          {weather.rainChance}% rain chance
        </p>
      </div>
      <p className="mt-3 rounded-md border border-cyan-500/30 bg-cyan-500/10 p-3 text-sm text-slate-700 dark:text-slate-200">
        {weather.recommendation || "Plan flexible stops for weather changes."}
      </p>
    </div>
  );
};

export default WeatherCard;
