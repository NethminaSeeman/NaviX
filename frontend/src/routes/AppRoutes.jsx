import { lazy, Suspense, useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useLocation, Routes, Route } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import RequireAuth from "@/routes/RequireAuth";
import RequireAccess from "@/routes/RequireAccess";
import RequireAdmin from "@/routes/RequireAdmin";

const HomePage = lazy(() => import("@/pages/HomePage"));
const ChatAssistantPage = lazy(() => import("@/pages/ChatAssistantPage"));
const LiveMapPage = lazy(() => import("@/pages/LiveMapPage"));
const DestinationDetailsPage = lazy(() => import("@/pages/DestinationDetailsPage"));
const AboutPage = lazy(() => import("@/pages/AboutPage"));
const ContactPage = lazy(() => import("@/pages/ContactPage"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/RegisterPage"));
const PricingPage = lazy(() => import("@/pages/PricingPage"));
const AccountPage = lazy(() => import("@/pages/AccountPage"));
const BillingResultPage = lazy(() => import("@/pages/BillingResultPage"));
const AdminUsersPage = lazy(() => import("@/pages/AdminUsersPage"));

const RouteFallback = () => (
  <div className="tech-panel p-6 text-sm text-slate-500 dark:text-slate-300">
    Loading page...
  </div>
);

const PageTransition = ({ children, reducedMotion }) => {
  const initial = reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 };
  const animate = reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 };
  const exit = reducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 };

  return (
    <motion.div
      initial={initial}
      animate={animate}
      exit={exit}
      transition={{ duration: reducedMotion ? 0.16 : 0.24, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
};

const gated = (element) => (
  <RequireAuth>
    <RequireAccess>{element}</RequireAccess>
  </RequireAuth>
);

const AppRoutes = () => {
  const location = useLocation();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname]);

  const withTransition = (element) => (
    <Suspense fallback={<RouteFallback />}>
      <PageTransition reducedMotion={reducedMotion}>{element}</PageTransition>
    </Suspense>
  );

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route element={<MainLayout />}>
          {/* Public marketing */}
          <Route path="/" element={withTransition(<HomePage />)} />
          <Route path="/about" element={withTransition(<AboutPage />)} />
          <Route path="/contact" element={withTransition(<ContactPage />)} />
          <Route path="/pricing" element={withTransition(<PricingPage />)} />

          {/* Auth */}
          <Route path="/login" element={withTransition(<LoginPage />)} />
          <Route path="/register" element={withTransition(<RegisterPage />)} />
          <Route
            path="/account"
            element={
              withTransition(
                <RequireAuth>
                  <AccountPage />
                </RequireAuth>
              )
            }
          />
          <Route
            path="/admin/users"
            element={
              withTransition(
                <RequireAuth>
                  <RequireAdmin>
                    <AdminUsersPage />
                  </RequireAdmin>
                </RequireAuth>
              )
            }
          />
          <Route
            path="/billing/success"
            element={
              withTransition(<BillingResultPage status="success" />)
            }
          />
          <Route
            path="/billing/cancel"
            element={
              withTransition(<BillingResultPage status="cancel" />)
            }
          />

          {/* Gated premium pages */}
          <Route
            path="/chat"
            element={withTransition(gated(<ChatAssistantPage />))}
          />
          <Route
            path="/map"
            element={withTransition(gated(<LiveMapPage />))}
          />
          <Route
            path="/destination/:id"
            element={withTransition(gated(<DestinationDetailsPage />))}
          />

          <Route
            path="*"
            element={
              withTransition(
                <div className="glass-card p-8 text-center">
                  <h1 className="section-title">Page Not Found</h1>
                  <p className="mt-2 text-sm text-slate-500">
                    The page you are looking for does not exist.
                  </p>
                </div>
              )
            }
          />
        </Route>
      </Routes>
    </AnimatePresence>
  );
};

export default AppRoutes;
