import { useEffect, useCallback, useRef } from 'react';

interface WebVitalsMetric {
  name: string;
  value: number;
  id: string;
  delta: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

interface PerformanceMetrics {
  cls: number | null;
  fcp: number | null;
  fid: number | null;
  lcp: number | null;
  ttfb: number | null;
  inp: number | null;
}

/**
 * Hook for monitoring Web Vitals and performance metrics
 */
export function useWebVitals(onMetric?: (metric: WebVitalsMetric) => void) {
  const metricsRef = useRef<PerformanceMetrics>({
    cls: null,
    fcp: null,
    fid: null,
    lcp: null,
    ttfb: null,
    inp: null,
  });

  const sendToAnalytics = useCallback((metric: WebVitalsMetric) => {
    // Update local metrics
    metricsRef.current[metric.name.toLowerCase() as keyof PerformanceMetrics] = metric.value;
    
    // Call custom handler
    onMetric?.(metric);
    
    // Send to analytics service (can be configured)
    if (import.meta.env.PROD) {
      // Example: send to Google Analytics
      if (typeof (window as any).gtag !== 'undefined') {
        (window as any).gtag('event', metric.name, {
          event_category: 'Web Vitals',
          value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
          event_label: metric.id,
          non_interaction: true,
        });
      }
      
      // Example: send to custom analytics endpoint
      fetch('/api/analytics/web-vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metric),
      }).catch(() => {
        // Silently fail if analytics endpoint is not available
      });
    }
  }, [onMetric]);

  useEffect(() => {
    // Dynamically import web-vitals library
    import('web-vitals').then(({ onCLS, onFCP, onLCP, onTTFB, onINP }) => {
      onCLS(sendToAnalytics);
      onFCP(sendToAnalytics);
      onLCP(sendToAnalytics);
      onTTFB(sendToAnalytics);
      onINP(sendToAnalytics);
    }).catch(() => {
      // web-vitals not available, continue without monitoring
      console.warn('Web Vitals monitoring not available');
    });
  }, [sendToAnalytics]);

  return metricsRef.current;
}

/**
 * Hook for monitoring custom performance metrics
 */
export function usePerformanceMetrics() {
  const measureRef = useRef<Map<string, number>>(new Map());

  const startMeasure = useCallback((name: string) => {
    measureRef.current.set(name, performance.now());
  }, []);

  const endMeasure = useCallback((name: string) => {
    const startTime = measureRef.current.get(name);
    if (startTime) {
      const duration = performance.now() - startTime;
      measureRef.current.delete(name);
      
      // Log performance metric
      console.log(`Performance: ${name} took ${duration.toFixed(2)}ms`);
      
      // Send to analytics in production
      if (import.meta.env.PROD) {
        fetch('/api/analytics/performance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, duration }),
        }).catch(() => {});
      }
      
      return duration;
    }
    return null;
  }, []);

  const measureAsync = useCallback(async <T>(
    name: string, 
    asyncFn: () => Promise<T>
  ): Promise<T> => {
    startMeasure(name);
    try {
      const result = await asyncFn();
      endMeasure(name);
      return result;
    } catch (error) {
      endMeasure(name);
      throw error;
    }
  }, [startMeasure, endMeasure]);

  return { startMeasure, endMeasure, measureAsync };
}

/**
 * Hook for monitoring component render performance
 */
export function useRenderMetrics(componentName: string) {
  const renderCountRef = useRef(0);
  const mountTimeRef = useRef<number>(0);

  useEffect(() => {
    renderCountRef.current += 1;
    
    if (renderCountRef.current === 1) {
      mountTimeRef.current = performance.now();
    }
    
    // Log excessive re-renders in development
    if (import.meta.env.DEV && renderCountRef.current > 10) {
      console.warn(
        `Component ${componentName} has rendered ${renderCountRef.current} times. Consider optimization.`
      );
    }
  });

  const getRenderInfo = useCallback(() => ({
    renderCount: renderCountRef.current,
    mountTime: mountTimeRef.current,
    isFirstRender: renderCountRef.current === 1,
  }), []);

  return getRenderInfo;
}

/**
 * Hook for monitoring memory usage (experimental)
 */
export function useMemoryMonitoring() {
  const checkMemory = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
      };
    }
    return null;
  }, []);

  useEffect(() => {
    // Check memory usage periodically in development
    if (import.meta.env.DEV) {
      const interval = setInterval(() => {
        const memory = checkMemory();
        if (memory) {
          const usedMB = Math.round(memory.usedJSHeapSize / 1048576);
          const totalMB = Math.round(memory.totalJSHeapSize / 1048576);
          console.log(`Memory usage: ${usedMB}MB / ${totalMB}MB`);
        }
      }, 30000); // Check every 30 seconds

      return () => clearInterval(interval);
    }
  }, [checkMemory]);

  return checkMemory;
}

/**
 * Hook for performance-optimized component updates
 */
export function useOptimizedUpdates<T>(
  value: T,
  compareFn?: (prev: T, next: T) => boolean
) {
  const prevValueRef = useRef<T>(value);
  const hasChanged = compareFn ? 
    !compareFn(prevValueRef.current, value) :
    prevValueRef.current !== value;

  if (hasChanged) {
    prevValueRef.current = value;
  }

  return prevValueRef.current;
}