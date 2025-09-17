import { Skeleton } from '@/components/ui/skeleton';

/**
 * Page-level loading component with skeleton structure
 * Used as fallback for lazy-loaded routes
 */
export function PageLoader() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation skeleton */}
      <div className="h-16 bg-card border-b border-border">
        <div className="container mx-auto px-4 h-full flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <div className="flex space-x-4">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </div>

      {/* Main content skeleton */}
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Header skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>

          {/* Content grid skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="h-48 w-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Simple spinner component for inline loading states
 */
export function SimpleLoader({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center p-8 ${className}`}>
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

/**
 * Component-level loading skeleton for lazy components
 */
export function ComponentLoader({ height = 'h-64' }: { height?: string }) {
  return (
    <div className={`w-full ${height} flex items-center justify-center bg-muted/20 rounded-lg`}>
      <div className="flex flex-col items-center space-y-2">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    </div>
  );
}

/**
 * Error boundary fallback for lazy components
 */
interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

export function LazyComponentError({ error, resetError }: ErrorFallbackProps) {
  return (
    <div className="w-full h-64 flex items-center justify-center bg-destructive/10 rounded-lg border border-destructive/20">
      <div className="text-center space-y-4 p-6">
        <h3 className="text-lg font-semibold text-destructive">Erro ao carregar componente</h3>
        <p className="text-sm text-muted-foreground">
          {error.message || 'Ocorreu um erro inesperado.'}
        </p>
        <button
          onClick={resetError}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}