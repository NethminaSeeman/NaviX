import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { LocationProvider } from "@/context/LocationContext";
import { WeatherProvider } from "@/context/WeatherContext";
import { ChatProvider } from "@/context/ChatContext";

export const AppProviders = ({ children }) => (
  <ThemeProvider>
    <AuthProvider>
      <LocationProvider>
        <WeatherProvider>
          <ChatProvider>{children}</ChatProvider>
        </WeatherProvider>
      </LocationProvider>
    </AuthProvider>
  </ThemeProvider>
);
