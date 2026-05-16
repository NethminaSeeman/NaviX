import { FiCloudRain, FiDroplet, FiThermometer } from "react-icons/fi";

const WeatherCard = ({ weather }) => {
  if (!weather) return null;

  return (
    <div className="glass-card p-4 md:p-5">
      <h3 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">
        Weather-Aware Insights
      </h3>
      <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
        <p className="flex items-center gap-2 rounded-xl bg-white/60 p-2 dark:bg-slate-800/60">
          <FiThermometer className="text-ceygo-secondary" />
          {weather.temperature} C
        </p>
        <p className="flex items-center gap-2 rounded-xl bg-white/60 p-2 dark:bg-slate-800/60">
          <FiDroplet className="text-ceygo-secondary" />
          {weather.humidity}% humidity
        </p>
        <p className="flex items-center gap-2 rounded-xl bg-white/60 p-2 dark:bg-slate-800/60">
          <FiCloudRain className="text-ceygo-secondary" />
          {weather.rainChance}% rain chance
        </p>
      </div>
      <p className="mt-3 rounded-xl bg-ceygo-primary/10 p-3 text-sm text-slate-700 dark:text-slate-200">
        {weather.recommendation || "Plan flexible stops for weather changes."}
      </p>
    </div>
  );
};

export default WeatherCard;
