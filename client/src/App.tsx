import { Switch, Route } from "wouter";
import { Suspense, lazy } from "react";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/contexts/I18nContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/hooks/useAuth";
import { PageLoader, LazyComponentError } from "@/components/ui/page-loader";
import ProtectedRoute from "@/components/protected-route";

// Critical routes - loaded immediately
import Landing from "@/pages/landing";
import Properties from "@/pages/properties";

// Lazy-loaded routes - code splitting for better performance
const Home = lazy(() => import("@/pages/home"));
const PropertyDetail = lazy(() => import("@/pages/property-detail"));
const AgentDashboard = lazy(() => import("@/pages/agent-dashboard"));
const AdminLogin = lazy(() => import("@/pages/admin-login"));
const Unauthorized = lazy(() => import("@/pages/unauthorized"));
const HelpCenter = lazy(() => import("@/pages/help-center"));
const Contact = lazy(() => import("@/pages/contact"));
const Privacy = lazy(() => import("@/pages/privacy"));
const Terms = lazy(() => import("@/pages/terms"));
const HealthDashboard = lazy(() => import("@/pages/health-dashboard"));
const NotFound = lazy(() => import("@/pages/not-found"));

/**
 * Wrapper component for lazy-loaded routes with error boundary
 */
function LazyRoute({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={<LazyComponentError error={new Error("Falha ao carregar a página")} resetError={() => window.location.reload()} />}
    >
      <Suspense fallback={<PageLoader />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

/**
 * Wrapper for protected lazy routes
 */
function ProtectedLazyRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <LazyRoute>
        {children}
      </LazyRoute>
    </ProtectedRoute>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {/* Public routes - always accessible */}
      <Route path="/admin/login">
        {() => (
          <LazyRoute>
            <AdminLogin />
          </LazyRoute>
        )}
      </Route>
      <Route path="/unauthorized">
        {() => (
          <LazyRoute>
            <Unauthorized />
          </LazyRoute>
        )}
      </Route>
      <Route path="/help-center">
        {() => (
          <LazyRoute>
            <HelpCenter />
          </LazyRoute>
        )}
      </Route>
      <Route path="/contact">
        {() => (
          <LazyRoute>
            <Contact />
          </LazyRoute>
        )}
      </Route>
      <Route path="/privacy">
        {() => (
          <LazyRoute>
            <Privacy />
          </LazyRoute>
        )}
      </Route>
      <Route path="/terms">
        {() => (
          <LazyRoute>
            <Terms />
          </LazyRoute>
        )}
      </Route>
      
      {/* Dynamic routes based on authentication */}
      {isLoading || !isAuthenticated ? (
        <>
          {/* Critical routes for public users - no lazy loading */}
          <Route path="/" component={Landing} />
          <Route path="/properties" component={Properties} />
          <Route path="/property/:id">
            {(params) => (
              <LazyRoute>
                <PropertyDetail {...params} />
              </LazyRoute>
            )}
          </Route>
        </>
      ) : (
        <>
          <Route path="/">
            {() => (
              <LazyRoute>
                <Home />
              </LazyRoute>
            )}
          </Route>
          <Route path="/properties" component={Properties} />
          <Route path="/property/:id">
            {(params) => (
              <LazyRoute>
                <PropertyDetail {...params} />
              </LazyRoute>
            )}
          </Route>
          
          {/* Protected routes */}
          <Route path="/dashboard">
            {() => (
              <ProtectedLazyRoute>
                <AgentDashboard />
              </ProtectedLazyRoute>
            )}
          </Route>
          <Route path="/agent-dashboard">
            {() => (
              <ProtectedLazyRoute>
                <AgentDashboard />
              </ProtectedLazyRoute>
            )}
          </Route>
          <Route path="/admin/health">
            {() => (
              <ProtectedLazyRoute>
                <HealthDashboard />
              </ProtectedLazyRoute>
            )}
          </Route>
          <Route path="/admin/health-dashboard">
            {() => (
              <ProtectedLazyRoute>
                <HealthDashboard />
              </ProtectedLazyRoute>
            )}
          </Route>
        </>
      )}
      <Route>
        {() => (
          <LazyRoute>
            <NotFound />
          </LazyRoute>
        )}
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <I18nProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </I18nProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
