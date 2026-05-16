import { Outlet } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";

const MainLayout = () => (
  <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-zinc-950 dark:text-slate-100">
    <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_10%_8%,rgba(15,118,110,0.08),transparent_30%),radial-gradient(circle_at_85%_15%,rgba(14,165,233,0.1),transparent_28%)] dark:bg-[radial-gradient(circle_at_12%_8%,rgba(45,212,191,0.12),transparent_30%),radial-gradient(circle_at_88%_18%,rgba(34,211,238,0.14),transparent_28%)]" />
    <Navbar />
    <div className="mx-auto flex w-full max-w-[1560px] gap-4 px-3 py-3 md:px-5">
      <Sidebar />
      <main className="min-h-[calc(100vh-120px)] flex-1 pb-24 lg:pb-6">
        <Outlet />
      </main>
    </div>
    <Footer />
    <MobileBottomNav />
  </div>
);

export default MainLayout;
