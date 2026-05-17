import { AnimatePresence, motion } from "framer-motion";
import { useLocation, Routes, Route } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import HomePage from "@/pages/HomePage";
import ChatAssistantPage from "@/pages/ChatAssistantPage";
import LiveMapPage from "@/pages/LiveMapPage";
import DestinationDetailsPage from "@/pages/DestinationDetailsPage";
import AboutPage from "@/pages/AboutPage";
import ContactPage from "@/pages/ContactPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import PricingPage from "@/pages/PricingPage";
import AccountPage from "@/pages/AccountPage";
import BillingResultPage from "@/pages/BillingResultPage";
import AdminUsersPage from "@/pages/AdminUsersPage";
import RequireAuth from "@/routes/RequireAuth";
import RequireAccess from "@/routes/RequireAccess";
import RequireAdmin from "@/routes/RequireAdmin";

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

const gated = (element) => (
  <RequireAuth>
    <RequireAccess>{element}</RequireAccess>
  </RequireAuth>
);

const AppRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route element={<MainLayout />}>
          {/* Public marketing */}
          <Route path="/" element={<PageTransition><HomePage /></PageTransition>} />
          <Route path="/about" element={<PageTransition><AboutPage /></PageTransition>} />
          <Route path="/contact" element={<PageTransition><ContactPage /></PageTransition>} />
          <Route path="/pricing" element={<PageTransition><PricingPage /></PageTransition>} />

          {/* Auth */}
          <Route path="/login" element={<PageTransition><LoginPage /></PageTransition>} />
          <Route path="/register" element={<PageTransition><RegisterPage /></PageTransition>} />
          <Route
            path="/account"
            element={
              <PageTransition>
                <RequireAuth>
                  <AccountPage />
                </RequireAuth>
              </PageTransition>
            }
          />
          <Route
            path="/admin/users"
            element={
              <PageTransition>
                <RequireAuth>
                  <RequireAdmin>
                    <AdminUsersPage />
                  </RequireAdmin>
                </RequireAuth>
              </PageTransition>
            }
          />
          <Route
            path="/billing/success"
            element={
              <PageTransition>
                <BillingResultPage status="success" />
              </PageTransition>
            }
          />
          <Route
            path="/billing/cancel"
            element={
              <PageTransition>
                <BillingResultPage status="cancel" />
              </PageTransition>
            }
          />

          {/* Gated premium pages */}
          <Route
            path="/chat"
            element={<PageTransition>{gated(<ChatAssistantPage />)}</PageTransition>}
          />
          <Route
            path="/map"
            element={<PageTransition>{gated(<LiveMapPage />)}</PageTransition>}
          />
          <Route
            path="/destination/:id"
            element={<PageTransition>{gated(<DestinationDetailsPage />)}</PageTransition>}
          />

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
