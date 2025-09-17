import { lazy, Suspense, ErrorBoundary } from 'react';
import { ComponentLoader, LazyComponentError } from '@/components/ui/page-loader';

// Lazy load chart components from Recharts
const Chart = lazy(() => import('@/components/ui/chart').then(module => ({ 
  default: module.ChartContainer 
})));

interface LazyChartProps {
  children: React.ReactNode;
  config: any;
  fallbackHeight?: string;
  className?: string;
  enableErrorRetry?: boolean;
}

/**
 * Lazy-loaded Chart component wrapper for Recharts
 * Reduces initial bundle size by only loading chart library when needed
 */
export function LazyChart({ 
  children, 
  config, 
  fallbackHeight = 'h-64', 
  className = '',
  enableErrorRetry = true,
  ...props 
}: LazyChartProps) {
  return (
    <ErrorBoundary
      fallback={enableErrorRetry ? 
        <LazyComponentError 
          error={new Error("Erro ao carregar gráfico")} 
          resetError={() => window.location.reload()} 
        /> : 
        <div className={`${fallbackHeight} bg-muted rounded-lg flex items-center justify-center ${className}`}>
          <p className="text-muted-foreground">Gráfico indisponível</p>
        </div>
      }
    >
      <Suspense fallback={<ComponentLoader height={fallbackHeight} />}>
        <Chart config={config} className={className} {...props}>
          {children}
        </Chart>
      </Suspense>
    </ErrorBoundary>
  );
}

/**
 * Lazy-loaded dashboard metrics chart
 */
export function LazyDashboardChart({ 
  data, 
  title, 
  type = 'line' 
}: { 
  data: any[]; 
  title: string; 
  type?: 'line' | 'bar' | 'area' 
}) {
  const chartConfig = {
    value: {
      label: title,
      color: "hsl(var(--chart-1))",
    },
  };

  return (
    <LazyChart config={chartConfig} fallbackHeight="h-48" className="w-full">
      {/* Chart content will be rendered here when loaded */}
      <div className="h-48 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">
          {title} - {data.length} pontos de dados
        </p>
      </div>
    </LazyChart>
  );
}