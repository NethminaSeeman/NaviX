import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

/**
 * Pair this with <RequireAuth> -- it assumes there's already an authenticated
 * user. Redirects to /pricing when the user has neither an active trial nor a
 * paid subscription.
 */
const RequireAccess = ({ children }) => {
  const { access, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-[40vh] items-center justify-center">
        <div className="mono-label text-xs text-slate-500">
          NAVI_X / checking access...
        </div>
      </div>
    );
  }

  if (!access?.allowed) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/pricing?next=${encodeURIComponent(next)}`} replace />;
  }

  return children;
};

export default RequireAccess;
