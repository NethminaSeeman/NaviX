import { Outlet } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";

const MainLayout = () => (
  <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
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
