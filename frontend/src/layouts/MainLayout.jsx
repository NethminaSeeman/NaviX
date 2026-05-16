import { Outlet } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";

const MainLayout = () => (
  <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
    <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_15%_10%,rgba(0,169,157,0.08),transparent_28%),radial-gradient(circle_at_85%_20%,rgba(0,119,182,0.08),transparent_24%),radial-gradient(circle_at_50%_90%,rgba(255,183,3,0.08),transparent_22%)] dark:bg-[radial-gradient(circle_at_20%_10%,rgba(0,169,157,0.12),transparent_30%),radial-gradient(circle_at_90%_30%,rgba(0,119,182,0.12),transparent_28%)]" />
    <Navbar />
    <div className="mx-auto flex w-full max-w-7xl">
      <Sidebar />
      <main className="min-h-[calc(100vh-130px)] flex-1 px-4 py-6 pb-24 lg:pb-6">
        <Outlet />
      </main>
    </div>
    <Footer />
    <MobileBottomNav />
  </div>
);

export default MainLayout;
