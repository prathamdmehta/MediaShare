// src/components/layout/ProtectedRoute.tsx

import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

function ProtectedRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // If not authenticated, redirect to login
  // "replace" means the login page replaces this in browser history
  // so pressing back doesn't return to this page
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Outlet renders whatever child route matched
  // e.g. if route is /inbox, Outlet renders InboxPage
  return <Outlet />;
}

export default ProtectedRoute;
