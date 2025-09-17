/**
 * PERFORMANCE MONITORING SYSTEM
 * Comprehensive application metrics tracking and analysis
 */

import { EventEmitter } from 'events';
import { performance, PerformanceObserver } from 'perf_hooks';
import { createModuleLogger, ContextualLogger } from './logger';
import { config } from './config';

// Performance metrics interfaces
export interface EndpointMetrics {
  path: string;
  method: string;
  count: number;
  totalDuration: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  p50: number;
  p95: number;
  p99: number;
  errorCount: number;
  errorRate: number;
  lastAccessTime: string;
  durations: number[]; // For percentile calculations
}

export interface DatabaseMetrics {
  queryCount: number;
  slowQueryCount: number;
  totalDuration: number;
  averageDuration: number;
  errorCount: number;
  connectionCount: number;
  activeConnections: number;
  maxConnections: number;
  poolUtilization: number;
  slowQueries: Array<{
    query: string;
    duration: number;
    timestamp: string;
  }>;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  sets: number;
  deletes: number;
  totalDuration: number;
  averageDuration: number;
  errorCount: number;
  keyCount: number;
  memoryUsage: number;
}

export interface SystemMetrics {
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
    arrayBuffers: number;
  };
  cpuUsage: {
    user: number;
    system: number;
    percentage: number;
  };
  uptimeSeconds: number;
  gcMetrics: {
    collections: number;
    duration: number;
    freed: number;
    lastCollection: string;
  };
  eventLoopDelay: number;
  processId: number;
  nodeVersion: string;
}

export interface ExternalApiMetrics {
  [service: string]: {
    callCount: number;
    successCount: number;
    errorCount: number;
    totalDuration: number;
    averageDuration: number;
    successRate: number;
    lastCall: string;
    endpoints: {
      [endpoint: string]: {
        count: number;
        duration: number;
        errors: number;
      };
    };
  };
}

export interface ApplicationMetrics {
  startTime: string;
  uptime: number;
  totalRequests: number;
  activeConnections: number;
  endpoints: Map<string, EndpointMetrics>;
  database: DatabaseMetrics;
  cache: CacheMetrics;
  system: SystemMetrics;
  externalApis: ExternalApiMetrics;
  lastUpdate: string;
}

// Performance monitoring configuration
const monitoringConfig = {
  // Metrics collection intervals
  systemMetricsInterval: parseInt(process.env.SYSTEM_METRICS_INTERVAL || '60000', 10), // 1 minute
  gcMonitoringInterval: parseInt(process.env.GC_MONITORING_INTERVAL || '30000', 10), // 30 seconds
  
  // Retention settings
  endpointMetricsRetention: parseInt(process.env.ENDPOINT_METRICS_RETENTION || '1000', 10), // Keep last 1000 durations
  slowQueryRetention: parseInt(process.env.SLOW_QUERY_RETENTION || '100', 10), // Keep last 100 slow queries
  
  // Thresholds
  slowRequestThreshold: parseInt(process.env.SLOW_REQUEST_THRESHOLD || '2000', 10), // 2 seconds
  slowQueryThreshold: parseInt(process.env.SLOW_QUERY_THRESHOLD || '1000', 10), // 1 second
  highMemoryThreshold: parseInt(process.env.HIGH_MEMORY_THRESHOLD || '85', 10), // 85%
  highCpuThreshold: parseInt(process.env.HIGH_CPU_THRESHOLD || '80', 10), // 80%
  
  // Feature flags
  enableGcMonitoring: process.env.ENABLE_GC_MONITORING !== 'false',
  enableEventLoopMonitoring: process.env.ENABLE_EVENT_LOOP_MONITORING !== 'false',
  enablePerformanceObserver: process.env.ENABLE_PERFORMANCE_OBSERVER !== 'false',
} as const;

/**
 * PERFORMANCE MONITOR CLASS
 * Central hub for all application performance monitoring
 */
export class PerformanceMonitor extends EventEmitter {
  private logger: ContextualLogger;
  private metrics: ApplicationMetrics;
  private systemMetricsTimer?: NodeJS.Timeout;
  private gcObserver?: PerformanceObserver;
  private httpObserver?: PerformanceObserver;
  private startTime: number;
  private lastCpuUsage = process.cpuUsage();
  
  constructor() {
    super();
    this.logger = createModuleLogger('PerformanceMonitor');
    this.startTime = Date.now();
    
    // Initialize metrics
    this.metrics = {
      startTime: new Date().toISOString(),
      uptime: 0,
      totalRequests: 0,
      activeConnections: 0,
      endpoints: new Map(),
      database: this.initializeDatabaseMetrics(),
      cache: this.initializeCacheMetrics(),
      system: this.initializeSystemMetrics(),
      externalApis: {},
      lastUpdate: new Date().toISOString(),
    };
    
    this.setupMonitoring();
    this.logger.info('Performance monitor initialized');
  }
  
  private initializeDatabaseMetrics(): DatabaseMetrics {
    return {
      queryCount: 0,
      slowQueryCount: 0,
      totalDuration: 0,
      averageDuration: 0,
      errorCount: 0,
      connectionCount: 0,
      activeConnections: 0,
      maxConnections: 0,
      poolUtilization: 0,
      slowQueries: [],
    };
  }
  
  private initializeCacheMetrics(): CacheMetrics {
    return {
      hits: 0,
      misses: 0,
      hitRate: 0,
      sets: 0,
      deletes: 0,
      totalDuration: 0,
      averageDuration: 0,
      errorCount: 0,
      keyCount: 0,
      memoryUsage: 0,
    };
  }
  
  private initializeSystemMetrics(): SystemMetrics {
    const memUsage = process.memoryUsage();
    
    return {
      memoryUsage: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        percentage: 0,
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        arrayBuffers: memUsage.arrayBuffers,
      },
      cpuUsage: {
        user: 0,
        system: 0,
        percentage: 0,
      },
      uptimeSeconds: process.uptime(),
      gcMetrics: {
        collections: 0,
        duration: 0,
        freed: 0,
        lastCollection: '',
      },
      eventLoopDelay: 0,
      processId: process.pid,
      nodeVersion: process.version,
    };
  }
  
  private setupMonitoring(): void {
    // Setup system metrics collection
    this.systemMetricsTimer = setInterval(async () => {
      await this.collectSystemMetrics();
    }, monitoringConfig.systemMetricsInterval);
    
    // Setup garbage collection monitoring
    if (monitoringConfig.enableGcMonitoring) {
      this.setupGcMonitoring();
    }
    
    // Setup performance observers
    if (monitoringConfig.enablePerformanceObserver) {
      this.setupPerformanceObservers();
    }
    
    // Setup event loop delay monitoring
    if (monitoringConfig.enableEventLoopMonitoring) {
      this.setupEventLoopMonitoring().catch((error) => {
        this.logger.warn('Failed to setup event loop monitoring', { error: error instanceof Error ? error.message : String(error) });
      });
    }
  }
  
  private setupGcMonitoring(): void {
    try {
      this.gcObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        for (const entry of entries) {
          if (entry.entryType === 'gc') {
            this.metrics.system.gcMetrics.collections++;
            this.metrics.system.gcMetrics.duration += entry.duration;
            this.metrics.system.gcMetrics.lastCollection = new Date().toISOString();
            
            // Log significant GC events
            if (entry.duration > 100) { // > 100ms
              this.logger.warn('Long garbage collection detected', {
                duration: entry.duration,
                kind: (entry as any).kind,
                flags: (entry as any).flags,
              });
            }
          }
        }
      });
      
      this.gcObserver.observe({ entryTypes: ['gc'] });
    } catch (error) {
      this.logger.warn('Failed to setup GC monitoring', { error: error instanceof Error ? error.message : String(error) });
    }
  }
  
  private setupPerformanceObservers(): void {
    try {
      this.httpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        for (const entry of entries) {
          if (entry.entryType === 'measure' && entry.name.startsWith('http-')) {
            this.recordHttpMetrics(entry.name, entry.duration);
          }
        }
      });
      
      this.httpObserver.observe({ entryTypes: ['measure'] });
    } catch (error) {
      this.logger.warn('Failed to setup performance observers', { error: error instanceof Error ? error.message : String(error) });
    }
  }
  
  private async setupEventLoopMonitoring(): Promise<void> {
    const { monitorEventLoopDelay } = await import('node:perf_hooks');
    
    try {
      const histogram = monitorEventLoopDelay({ resolution: 20 });
      histogram.enable();
      
      setInterval(() => {
        const delay = histogram.mean / 1e6; // Convert to milliseconds
        this.metrics.system.eventLoopDelay = delay;
        
        // Log high event loop delay
        if (delay > 50) { // > 50ms
          this.logger.warn('High event loop delay detected', { delay });
        }
        
        histogram.reset();
      }, 5000); // Check every 5 seconds
    } catch (error) {
      this.logger.warn('Failed to setup event loop monitoring', { error: error instanceof Error ? error.message : String(error) });
    }
  }
  
  private async collectSystemMetrics(): Promise<void> {
    try {
      // Memory metrics
      const memUsage = process.memoryUsage();
      const os = await import('node:os');
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedSystemMem = totalMem - freeMem;
      
      this.metrics.system.memoryUsage = {
        used: usedSystemMem,
        total: totalMem,
        percentage: (usedSystemMem / totalMem) * 100,
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        arrayBuffers: memUsage.arrayBuffers,
      };
      
      // CPU metrics
      const currentCpuUsage = process.cpuUsage(this.lastCpuUsage);
      const totalUsage = currentCpuUsage.user + currentCpuUsage.system;
      const intervalMs = monitoringConfig.systemMetricsInterval;
      const cpuPercent = (totalUsage / (intervalMs * 1000)) * 100;
      
      this.metrics.system.cpuUsage = {
        user: currentCpuUsage.user / 1000, // Convert to milliseconds
        system: currentCpuUsage.system / 1000,
        percentage: Math.min(cpuPercent, 100), // Cap at 100%
      };
      
      this.lastCpuUsage = process.cpuUsage();
      
      // Uptime
      this.metrics.system.uptimeSeconds = process.uptime();
      this.metrics.uptime = Date.now() - this.startTime;
      
      // Update last update timestamp
      this.metrics.lastUpdate = new Date().toISOString();
      
      // Check for high resource usage
      this.checkResourceThresholds();
      
      // Emit system metrics event
      this.emit('systemMetrics', this.metrics.system);
      
    } catch (error) {
      this.logger.error('Failed to collect system metrics', error);
    }
  }
  
  private checkResourceThresholds(): void {
    const { memoryUsage, cpuUsage } = this.metrics.system;
    
    // Check memory threshold
    if (memoryUsage.percentage > monitoringConfig.highMemoryThreshold) {
      this.logger.warn('High memory usage detected', {
        percentage: memoryUsage.percentage,
        threshold: monitoringConfig.highMemoryThreshold,
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
      });
      
      this.emit('highMemoryUsage', memoryUsage);
    }
    
    // Check CPU threshold
    if (cpuUsage.percentage > monitoringConfig.highCpuThreshold) {
      this.logger.warn('High CPU usage detected', {
        percentage: cpuUsage.percentage,
        threshold: monitoringConfig.highCpuThreshold,
        user: cpuUsage.user,
        system: cpuUsage.system,
      });
      
      this.emit('highCpuUsage', cpuUsage);
    }
  }
  
  private recordHttpMetrics(name: string, duration: number): void {
    const [, method, path] = name.split('-');
    const key = `${method} ${path}`;
    
    let endpointMetrics = this.metrics.endpoints.get(key);
    if (!endpointMetrics) {
      endpointMetrics = {
        path,
        method,
        count: 0,
        totalDuration: 0,
        averageDuration: 0,
        minDuration: duration,
        maxDuration: duration,
        p50: 0,
        p95: 0,
        p99: 0,
        errorCount: 0,
        errorRate: 0,
        lastAccessTime: new Date().toISOString(),
        durations: [],
      };
      this.metrics.endpoints.set(key, endpointMetrics);
    }
    
    // Update metrics
    endpointMetrics.count++;
    endpointMetrics.totalDuration += duration;
    endpointMetrics.averageDuration = endpointMetrics.totalDuration / endpointMetrics.count;
    endpointMetrics.minDuration = Math.min(endpointMetrics.minDuration, duration);
    endpointMetrics.maxDuration = Math.max(endpointMetrics.maxDuration, duration);
    endpointMetrics.lastAccessTime = new Date().toISOString();
    
    // Store duration for percentile calculations (with retention limit)
    endpointMetrics.durations.push(duration);
    if (endpointMetrics.durations.length > monitoringConfig.endpointMetricsRetention) {
      endpointMetrics.durations.shift();
    }
    
    // Calculate percentiles
    this.calculatePercentiles(endpointMetrics);
  }
  
  private calculatePercentiles(metrics: EndpointMetrics): void {
    const sorted = [...metrics.durations].sort((a, b) => a - b);
    const length = sorted.length;
    
    if (length === 0) return;
    
    metrics.p50 = sorted[Math.floor(length * 0.5)];
    metrics.p95 = sorted[Math.floor(length * 0.95)];
    metrics.p99 = sorted[Math.floor(length * 0.99)];
  }
  
  // Public methods for recording metrics
  
  recordHttpRequest(method: string, path: string, duration: number, statusCode: number): void {
    const key = `${method} ${path}`;
    this.metrics.totalRequests++;
    
    // Record in performance timeline for observer
    const measureName = `http-${method}-${path.replace(/[^a-zA-Z0-9]/g, '_')}`;
    performance.mark(`${measureName}-start`);
    performance.mark(`${measureName}-end`);
    performance.measure(measureName, `${measureName}-start`, `${measureName}-end`);
    
    // Update endpoint metrics directly
    let endpointMetrics = this.metrics.endpoints.get(key);
    if (!endpointMetrics) {
      endpointMetrics = {
        path,
        method,
        count: 0,
        totalDuration: 0,
        averageDuration: 0,
        minDuration: duration,
        maxDuration: duration,
        p50: 0,
        p95: 0,
        p99: 0,
        errorCount: 0,
        errorRate: 0,
        lastAccessTime: new Date().toISOString(),
        durations: [],
      };
      this.metrics.endpoints.set(key, endpointMetrics);
    }
    
    // Update metrics
    endpointMetrics.count++;
    endpointMetrics.totalDuration += duration;
    endpointMetrics.averageDuration = endpointMetrics.totalDuration / endpointMetrics.count;
    endpointMetrics.minDuration = Math.min(endpointMetrics.minDuration, duration);
    endpointMetrics.maxDuration = Math.max(endpointMetrics.maxDuration, duration);
    endpointMetrics.lastAccessTime = new Date().toISOString();
    
    // Track errors
    if (statusCode >= 400) {
      endpointMetrics.errorCount++;
      endpointMetrics.errorRate = endpointMetrics.errorCount / endpointMetrics.count;
    }
    
    // Store duration for percentile calculations
    endpointMetrics.durations.push(duration);
    if (endpointMetrics.durations.length > monitoringConfig.endpointMetricsRetention) {
      endpointMetrics.durations.shift();
    }
    
    this.calculatePercentiles(endpointMetrics);
    
    // Log slow requests
    if (duration > monitoringConfig.slowRequestThreshold) {
      this.logger.warn('Slow request detected', {
        method,
        path,
        duration,
        statusCode,
        threshold: monitoringConfig.slowRequestThreshold,
      });
    }
  }
  
  recordDatabaseQuery(query: string, duration: number, success: boolean): void {
    this.metrics.database.queryCount++;
    this.metrics.database.totalDuration += duration;
    this.metrics.database.averageDuration = this.metrics.database.totalDuration / this.metrics.database.queryCount;
    
    if (!success) {
      this.metrics.database.errorCount++;
    }
    
    // Track slow queries
    if (duration > monitoringConfig.slowQueryThreshold) {
      this.metrics.database.slowQueryCount++;
      
      // Store slow query details
      this.metrics.database.slowQueries.push({
        query: query.length > 200 ? query.substring(0, 197) + '...' : query,
        duration,
        timestamp: new Date().toISOString(),
      });
      
      // Maintain retention limit
      if (this.metrics.database.slowQueries.length > monitoringConfig.slowQueryRetention) {
        this.metrics.database.slowQueries.shift();
      }
      
      this.logger.warn('Slow database query detected', {
        query: query.substring(0, 100),
        duration,
        threshold: monitoringConfig.slowQueryThreshold,
      });
    }
  }
  
  recordCacheOperation(operation: 'HIT' | 'MISS' | 'SET' | 'DELETE', duration: number, success: boolean = true): void {
    const cache = this.metrics.cache;
    
    switch (operation) {
      case 'HIT':
        cache.hits++;
        break;
      case 'MISS':
        cache.misses++;
        break;
      case 'SET':
        cache.sets++;
        break;
      case 'DELETE':
        cache.deletes++;
        break;
    }
    
    cache.totalDuration += duration;
    const totalOps = cache.hits + cache.misses + cache.sets + cache.deletes;
    cache.averageDuration = totalOps > 0 ? cache.totalDuration / totalOps : 0;
    cache.hitRate = cache.hits + cache.misses > 0 ? cache.hits / (cache.hits + cache.misses) : 0;
    
    if (!success) {
      cache.errorCount++;
    }
  }
  
  recordExternalApiCall(service: string, endpoint: string, duration: number, success: boolean): void {
    if (!this.metrics.externalApis[service]) {
      this.metrics.externalApis[service] = {
        callCount: 0,
        successCount: 0,
        errorCount: 0,
        totalDuration: 0,
        averageDuration: 0,
        successRate: 0,
        lastCall: '',
        endpoints: {},
      };
    }
    
    const serviceMetrics = this.metrics.externalApis[service];
    serviceMetrics.callCount++;
    serviceMetrics.totalDuration += duration;
    serviceMetrics.averageDuration = serviceMetrics.totalDuration / serviceMetrics.callCount;
    serviceMetrics.lastCall = new Date().toISOString();
    
    if (success) {
      serviceMetrics.successCount++;
    } else {
      serviceMetrics.errorCount++;
    }
    
    serviceMetrics.successRate = serviceMetrics.successCount / serviceMetrics.callCount;
    
    // Track endpoint-specific metrics
    if (!serviceMetrics.endpoints[endpoint]) {
      serviceMetrics.endpoints[endpoint] = {
        count: 0,
        duration: 0,
        errors: 0,
      };
    }
    
    const endpointMetrics = serviceMetrics.endpoints[endpoint];
    endpointMetrics.count++;
    endpointMetrics.duration += duration;
    
    if (!success) {
      endpointMetrics.errors++;
    }
  }
  
  updateConnectionCount(active: number, total: number): void {
    this.metrics.activeConnections = active;
    this.metrics.database.activeConnections = active;
    this.metrics.database.connectionCount = total;
    this.metrics.database.poolUtilization = total > 0 ? active / total : 0;
  }
  
  // Getter methods
  
  getMetrics(): ApplicationMetrics {
    return {
      ...this.metrics,
      endpoints: new Map(this.metrics.endpoints), // Return a copy
    };
  }
  
  getEndpointMetrics(method?: string, path?: string): EndpointMetrics[] {
    const results: EndpointMetrics[] = [];
    
    for (const [key, metrics] of Array.from(this.metrics.endpoints.entries())) {
      if ((!method || metrics.method === method) && (!path || metrics.path.includes(path))) {
        results.push(metrics);
      }
    }
    
    return results.sort((a, b) => b.count - a.count); // Sort by request count
  }
  
  getSystemHealth(): { healthy: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Check memory usage
    if (this.metrics.system.memoryUsage.percentage > monitoringConfig.highMemoryThreshold) {
      issues.push(`High memory usage: ${this.metrics.system.memoryUsage.percentage.toFixed(1)}%`);
    }
    
    // Check CPU usage
    if (this.metrics.system.cpuUsage.percentage > monitoringConfig.highCpuThreshold) {
      issues.push(`High CPU usage: ${this.metrics.system.cpuUsage.percentage.toFixed(1)}%`);
    }
    
    // Check event loop delay
    if (this.metrics.system.eventLoopDelay > 50) {
      issues.push(`High event loop delay: ${this.metrics.system.eventLoopDelay.toFixed(1)}ms`);
    }
    
    // Check database errors
    const dbErrorRate = this.metrics.database.queryCount > 0 
      ? this.metrics.database.errorCount / this.metrics.database.queryCount 
      : 0;
    if (dbErrorRate > 0.05) { // 5% error rate
      issues.push(`High database error rate: ${(dbErrorRate * 100).toFixed(1)}%`);
    }
    
    return {
      healthy: issues.length === 0,
      issues,
    };
  }
  
  // Cleanup method
  shutdown(): void {
    if (this.systemMetricsTimer) {
      clearInterval(this.systemMetricsTimer);
    }
    
    if (this.gcObserver) {
      this.gcObserver.disconnect();
    }
    
    if (this.httpObserver) {
      this.httpObserver.disconnect();
    }
    
    this.logger.info('Performance monitor shutdown completed');
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Helper functions for easy integration

export function recordHttpRequest(method: string, path: string, duration: number, statusCode: number): void {
  performanceMonitor.recordHttpRequest(method, path, duration, statusCode);
}

export function recordDatabaseQuery(query: string, duration: number, success: boolean = true): void {
  performanceMonitor.recordDatabaseQuery(query, duration, success);
}

export function recordCacheOperation(operation: 'HIT' | 'MISS' | 'SET' | 'DELETE', duration: number, success: boolean = true): void {
  performanceMonitor.recordCacheOperation(operation, duration, success);
}

export function recordExternalApiCall(service: string, endpoint: string, duration: number, success: boolean = true): void {
  performanceMonitor.recordExternalApiCall(service, endpoint, duration, success);
}

export function updateConnectionCount(active: number, total: number): void {
  performanceMonitor.updateConnectionCount(active, total);
}

export function getApplicationMetrics(): ApplicationMetrics {
  return performanceMonitor.getMetrics();
}

export function getSystemHealth(): { healthy: boolean; issues: string[] } {
  return performanceMonitor.getSystemHealth();
}

// Export the main class and instance
export default performanceMonitor;