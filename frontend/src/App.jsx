import { BrowserRouter } from "react-router-dom";
import { AppProviders } from "@/context/AppProviders";
import AppRoutes from "@/routes/AppRoutes";

const App = () => (
  <AppProviders>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </AppProviders>
);

export default App;
