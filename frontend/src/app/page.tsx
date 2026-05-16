import { MapView } from "@/components/map/MapView";
import { VoiceControl } from "@/components/voice/VoiceControl";
import { WeatherWidget } from "@/components/weather/WeatherWidget";

export default function HomePage() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section className="relative min-h-[60vh] overflow-hidden rounded-xl border border-ceygo-green/20 bg-white shadow-sm">
        <MapView />
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <VoiceControl />
        </div>
      </section>
      <aside className="space-y-4">
        <WeatherWidget />
      </aside>
    </div>
  );
}
