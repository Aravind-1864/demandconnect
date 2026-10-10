import { Navigate, Outlet, useLocation } from "react-router-dom";
import { homeFor, useAuth } from "../context/AuthContext";
import { PageLoader } from "./ui";

/**
 * Guards a route tree. Unauthenticated users go to /login (and come back
 * afterwards); users with the wrong role go to their own home.
 */
export default function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return <Outlet />;
}
