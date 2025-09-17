import { lazy, Suspense, ErrorBoundary } from 'react';
import { ComponentLoader, LazyComponentError } from '@/components/ui/page-loader';
import type { ComponentProps } from 'react';

// Lazy load the Map component
const Map = lazy(() => import('@/components/map'));

interface LazyMapProps extends ComponentProps<typeof Map> {
  fallbackHeight?: string;
  enableErrorRetry?: boolean;
}

/**
 * Lazy-loaded Map component with proper error handling and loading states
 * This component uses IntersectionObserver internally to only load the Maps API when needed
 */
export function LazyMap({ 
  fallbackHeight = 'h-96', 
  enableErrorRetry = true, 
  ...props 
}: LazyMapProps) {
  return (
    <ErrorBoundary
      fallback={enableErrorRetry ? 
        <LazyComponentError 
          error={new Error("Erro ao carregar o mapa")} 
          resetError={() => window.location.reload()} 
        /> : 
        <div className={`${fallbackHeight} bg-muted rounded-lg flex items-center justify-center`}>
          <p className="text-muted-foreground">Mapa indisponível</p>
        </div>
      }
    >
      <Suspense fallback={<ComponentLoader height={fallbackHeight} />}>
        <Map {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}