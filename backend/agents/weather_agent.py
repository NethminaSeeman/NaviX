from models.request_models import WeatherResponse
from services.agent_store import AgentStore


class WeatherAnalysisAgent:
    def __init__(self, agent_store: AgentStore | None = None) -> None:
        self.agent_store = agent_store

    def run(self, weather: WeatherResponse) -> str:
        if weather.rain:
            advice = (
                f"The weather is {weather.condition} at {weather.temperature:.0f} C. "
                "Recommend covered attractions, museums, temples, or short outdoor stops."
            )
        elif weather.temperature >= 31:
            advice = (
                f"It is warm at {weather.temperature:.0f} C with {weather.humidity}% humidity. "
                "Recommend early morning or sunset sightseeing and hydration."
            )
        else:
            advice = (
                f"The weather is {weather.condition} at {weather.temperature:.0f} C. "
                "Outdoor sightseeing is suitable with normal sun protection."
            )
        if self.agent_store:
            self.agent_store.log(
                "weather_agent",
                None,
                weather.model_dump(),
                {"advice": advice},
                status="success",
            )
        return advice
