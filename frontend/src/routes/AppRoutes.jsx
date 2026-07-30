import { Routes, Route } from "react-router-dom";
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

const gated = (element) => (
  <RequireAuth>
    <RequireAccess>{element}</RequireAccess>
  </RequireAuth>
);

const AppRoutes = () => (
  <Routes>
    <Route element={<MainLayout />}>
      {/* Public marketing */}
      <Route path="/" element={<HomePage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/pricing" element={<PricingPage />} />

      {/* Auth */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/account"
        element={
          <RequireAuth>
            <AccountPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/users"
        element={
          <RequireAuth>
            <RequireAdmin>
              <AdminUsersPage />
            </RequireAdmin>
          </RequireAuth>
        }
      />
      <Route path="/billing/success" element={<BillingResultPage status="success" />} />
      <Route path="/billing/cancel" element={<BillingResultPage status="cancel" />} />

      {/* Gated premium pages */}
      <Route path="/chat" element={gated(<ChatAssistantPage />)} />
      <Route path="/map" element={gated(<LiveMapPage />)} />
      <Route path="/destination/:id" element={gated(<DestinationDetailsPage />)} />

      <Route
        path="*"
        element={
          <div className="glass-card p-8 text-center">
            <h1 className="section-title">Page Not Found</h1>
            <p className="mt-2 text-sm text-slate-500">
              The page you are looking for does not exist.
            </p>
          </div>
        }
      />
    </Route>
  </Routes>
);

export default AppRoutes;
