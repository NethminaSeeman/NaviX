from models.request_models import WeatherResponse


class WeatherAnalysisAgent:
    def run(self, weather: WeatherResponse) -> str:
        if weather.rain:
            return (
                f"The weather is {weather.condition} at {weather.temperature:.0f} C. "
                "Recommend covered attractions, museums, temples, or short outdoor stops."
            )
        if weather.temperature >= 31:
            return (
                f"It is warm at {weather.temperature:.0f} C with {weather.humidity}% humidity. "
                "Recommend early morning or sunset sightseeing and hydration."
            )
        return (
            f"The weather is {weather.condition} at {weather.temperature:.0f} C. "
            "Outdoor sightseeing is suitable with normal sun protection."
        )
