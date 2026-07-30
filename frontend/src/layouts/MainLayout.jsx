import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";

const MainLayout = () => {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900 transition-colors dark:bg-zinc-950 dark:text-slate-100">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_10%_8%,rgba(15,118,110,0.08),transparent_30%),radial-gradient(circle_at_85%_15%,rgba(14,165,233,0.1),transparent_28%)] dark:bg-[radial-gradient(circle_at_12%_8%,rgba(45,212,191,0.12),transparent_30%),radial-gradient(circle_at_88%_18%,rgba(34,211,238,0.14),transparent_28%)]" />
      <Navbar />
      <div className="mx-auto flex w-full max-w-[1560px] gap-4 px-3 py-3 md:px-5">
        <Sidebar />
        <main className="min-h-[calc(100vh-120px)] w-0 flex-1 pb-28 lg:pb-8">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default MainLayout;
