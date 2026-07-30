import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const RequireAdmin = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-[40vh] items-center justify-center">
        <div className="mono-label text-xs text-slate-500">
          NAVI_X / checking admin access...
        </div>
      </div>
    );
  }

  if (!user?.is_admin) {
    return <Navigate to="/account" replace />;
  }

  return children;
};

export default RequireAdmin;
