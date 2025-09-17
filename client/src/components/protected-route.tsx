import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requiredRoles?: string[];
  redirectTo?: string;
}

export default function ProtectedRoute({ 
  children, 
  requireAdmin = false, 
  requiredRoles = [], 
  redirectTo = "/admin/login" 
}: ProtectedRouteProps) {
  const { isAuthenticated, user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        // Store current location for redirect after login
        const currentPath = window.location.pathname + window.location.search;
        const returnTo = encodeURIComponent(currentPath);
        setLocation(`${redirectTo}?returnTo=${returnTo}`);
        return;
      }

      // Check admin requirement (legacy)
      if (requireAdmin && (user as any)?.role !== 'admin') {
        setLocation('/unauthorized');
        return;
      }

      // Check specific role requirements (NEW SECURITY FIX)
      if (requiredRoles.length > 0) {
        const userRole = (user as any)?.role;
        if (!userRole || !requiredRoles.includes(userRole)) {
          setLocation('/unauthorized');
          return;
        }
      }
    }
  }, [isAuthenticated, user, isLoading, requireAdmin, redirectTo, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  // Check admin requirement (legacy)
  if (requireAdmin && (user as any)?.role !== 'admin') {
    return null; // Will redirect via useEffect
  }

  // Check specific role requirements (NEW SECURITY FIX)
  if (requiredRoles.length > 0) {
    const userRole = (user as any)?.role;
    if (!userRole || !requiredRoles.includes(userRole)) {
      return null; // Will redirect via useEffect
    }
  }

  return <>{children}</>;
}