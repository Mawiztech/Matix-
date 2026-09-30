import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import FullScreenLoader from "./FullScreenLoader";

/**
 * Wraps a route tree. Requires an authenticated session and, if `role` is
 * given, requires the profile's role to match. Users can never reach another
 * role's dashboard by typing the URL directly — they are redirected to their
 * own dashboard instead.
 */
export default function ProtectedRoute({ role, children }) {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <FullScreenLoader label="Checking your session..." />;
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Session exists but profile hasn't loaded yet (e.g. right after login)
  if (!profile) {
    return <FullScreenLoader label="Loading your profile..." />;
  }

  if (role && profile.role !== role) {
    return <Navigate to={`/${profile.role}/dashboard`} replace />;
  }

  return children;
}
