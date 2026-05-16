import { AnimatePresence, motion } from "framer-motion";
import { useLocation, Routes, Route } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import HomePage from "@/pages/HomePage";
import ChatAssistantPage from "@/pages/ChatAssistantPage";
import LiveMapPage from "@/pages/LiveMapPage";
import DestinationDetailsPage from "@/pages/DestinationDetailsPage";
import AboutPage from "@/pages/AboutPage";
import ContactPage from "@/pages/ContactPage";

const PageTransition = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.25 }}
  >
    {children}
  </motion.div>
);

const AppRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route element={<MainLayout />}>
          <Route path="/" element={<PageTransition><HomePage /></PageTransition>} />
          <Route
            path="/chat"
            element={<PageTransition><ChatAssistantPage /></PageTransition>}
          />
          <Route path="/map" element={<PageTransition><LiveMapPage /></PageTransition>} />
          <Route
            path="/destination/:id"
            element={<PageTransition><DestinationDetailsPage /></PageTransition>}
          />
          <Route path="/about" element={<PageTransition><AboutPage /></PageTransition>} />
          <Route path="/contact" element={<PageTransition><ContactPage /></PageTransition>} />
          <Route
            path="*"
            element={
              <PageTransition>
                <div className="glass-card p-8 text-center">
                  <h1 className="section-title">Page Not Found</h1>
                  <p className="mt-2 text-sm text-slate-500">
                    The page you are looking for does not exist.
                  </p>
                </div>
              </PageTransition>
            }
          />
        </Route>
      </Routes>
    </AnimatePresence>
  );
};

export default AppRoutes;
