/**
 * APPLICATION HEALTH MONITORING SYSTEM
 * Comprehensive health checks for system dependencies and external services
 */

import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import { createModuleLogger, ContextualLogger } from './logger';
import { config } from './config';
import { db } from '../db';
import { performanceMonitor } from './monitoring';

// Health check interfaces
export interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: string;
  responseTime: number;
  message?: string;
  details?: Record<string, any>;
  metadata?: {
    version?: string;
    uptime?: number;
    lastError?: string;
    checkCount?: number;
    consecutiveFailures?: number;
  };
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: Record<string, HealthCheck>;
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
  };
}

export interface DependencyConfig {
  name: string;
  type: 'database' | 'cache' | 'external_api' | 'file_system' | 'service';
  enabled: boolean;
  timeout: number;
  retries: number;
  interval: number;
  critical: boolean; // If critical, application is considered unhealthy if this check fails
  healthCheck: () => Promise<HealthCheck>;
}

// Health monitoring configuration
const healthConfig = {
  // Check intervals
  healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '60000', 10), // 1 minute
  criticalCheckInterval: parseInt(process.env.CRITICAL_CHECK_INTERVAL || '30000', 10), // 30 seconds
  
  // Timeouts
  defaultTimeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '5000', 10), // 5 seconds
  databaseTimeout: parseInt(process.env.DB_HEALTH_CHECK_TIMEOUT || '3000', 10), // 3 seconds
  externalApiTimeout: parseInt(process.env.EXTERNAL_API_TIMEOUT || '10000', 10), // 10 seconds
  
  // Thresholds
  maxConsecutiveFailures: parseInt(process.env.MAX_CONSECUTIVE_FAILURES || '3', 10),
  degradedThreshold: parseInt(process.env.DEGRADED_THRESHOLD || '2000', 10), // 2 seconds
  unhealthyThreshold: parseInt(process.env.UNHEALTHY_THRESHOLD || '5000', 10), // 5 seconds
  
  // Feature flags
  enablePeriodicChecks: process.env.ENABLE_PERIODIC_HEALTH_CHECKS !== 'false',
  enableDetailedChecks: process.env.ENABLE_DETAILED_HEALTH_CHECKS !== 'false',
  enableExternalChecks: process.env.ENABLE_EXTERNAL_HEALTH_CHECKS !== 'false',
} as const;

/**
 * HEALTH MONITOR CLASS
 * Central health monitoring system for all application dependencies
 */
export class HealthMonitor extends EventEmitter {
  private logger: ContextualLogger;
  private dependencies: Map<string, DependencyConfig>;
  private healthStatus: HealthStatus;
  private healthCheckTimer?: NodeJS.Timeout;
  private criticalCheckTimer?: NodeJS.Timeout;
  private startTime: number;
  
  constructor() {
    super();
    this.logger = createModuleLogger('HealthMonitor');
    this.dependencies = new Map();
    this.startTime = Date.now();
    
    // Initialize health status
    this.healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: 0,
      version: process.env.npm_package_version || '1.0.0',
      environment: config.nodeEnv,
      checks: {},
      summary: {
        total: 0,
        healthy: 0,
        degraded: 0,
        unhealthy: 0,
      },
    };
    
    this.setupDependencies();
    this.startHealthChecks();
    this.logger.info('Health monitor initialized');
  }
  
  private setupDependencies(): void {
    // Database health check
    this.registerDependency({
      name: 'database',
      type: 'database',
      enabled: true,
      timeout: healthConfig.databaseTimeout,
      retries: 2,
      interval: healthConfig.healthCheckInterval,
      critical: true,
      healthCheck: this.checkDatabaseHealth.bind(this),
    });
    
    // Cache health check (if enabled)
    if (config.cache.enabled) {
      this.registerDependency({
        name: 'cache',
        type: 'cache',
        enabled: config.cache.enabled,
        timeout: healthConfig.defaultTimeout,
        retries: 1,
        interval: healthConfig.healthCheckInterval,
        critical: false,
        healthCheck: this.checkCacheHealth.bind(this),
      });
    }
    
    // Google Maps API health check (if configured)
    if (config.googleMaps.apiKey && healthConfig.enableExternalChecks) {
      this.registerDependency({
        name: 'google_maps',
        type: 'external_api',
        enabled: true,
        timeout: healthConfig.externalApiTimeout,
        retries: 1,
        interval: healthConfig.healthCheckInterval * 2, // Check less frequently
        critical: false,
        healthCheck: this.checkGoogleMapsHealth.bind(this),
      });
    }
    
    // Supabase health check (if configured)
    if (config.supabase.url && healthConfig.enableExternalChecks) {
      this.registerDependency({
        name: 'supabase',
        type: 'external_api',
        enabled: true,
        timeout: healthConfig.externalApiTimeout,
        retries: 1,
        interval: healthConfig.healthCheckInterval * 2,
        critical: false,
        healthCheck: this.checkSupabaseHealth.bind(this),
      });
    }
    
    // File system health check
    this.registerDependency({
      name: 'file_system',
      type: 'file_system',
      enabled: true,
      timeout: healthConfig.defaultTimeout,
      retries: 1,
      interval: healthConfig.healthCheckInterval,
      critical: true,
      healthCheck: this.checkFileSystemHealth.bind(this),
    });
    
    // Application health check (self)
    this.registerDependency({
      name: 'application',
      type: 'service',
      enabled: true,
      timeout: healthConfig.defaultTimeout,
      retries: 1,
      interval: healthConfig.criticalCheckInterval,
      critical: true,
      healthCheck: this.checkApplicationHealth.bind(this),
    });
  }
  
  registerDependency(config: DependencyConfig): void {
    this.dependencies.set(config.name, config);
    
    // Initialize health check status
    this.healthStatus.checks[config.name] = {
      name: config.name,
      status: 'healthy',
      lastCheck: new Date().toISOString(),
      responseTime: 0,
      metadata: {
        checkCount: 0,
        consecutiveFailures: 0,
      },
    };
    
    this.logger.info(`Registered health dependency: ${config.name}`, {
      type: config.type,
      critical: config.critical,
      enabled: config.enabled,
    });
  }
  
  private startHealthChecks(): void {
    if (!healthConfig.enablePeriodicChecks) {
      this.logger.info('Periodic health checks disabled');
      return;
    }
    
    // Regular health checks
    this.healthCheckTimer = setInterval(() => {
      this.performHealthChecks('regular');
    }, healthConfig.healthCheckInterval);
    
    // Critical health checks (more frequent)
    this.criticalCheckTimer = setInterval(() => {
      this.performHealthChecks('critical');
    }, healthConfig.criticalCheckInterval);
    
    // Perform initial health check
    this.performHealthChecks('initial');
  }
  
  private async performHealthChecks(type: 'initial' | 'regular' | 'critical' | 'manual'): Promise<void> {
    const startTime = performance.now();
    const checksToRun: DependencyConfig[] = [];
    
    // Determine which checks to run based on type
    for (const [name, dependency] of Array.from(this.dependencies.entries())) {
      if (!dependency.enabled) continue;
      
      if (type === 'critical' && dependency.critical) {
        checksToRun.push(dependency);
      } else if (type !== 'critical') {
        checksToRun.push(dependency);
      }
    }
    
    this.logger.debug(`Performing ${type} health checks`, {
      checksCount: checksToRun.length,
      checkNames: checksToRun.map(c => c.name),
    });
    
    // Run health checks in parallel
    const checkPromises = checksToRun.map(async (dependency) => {
      return this.runSingleHealthCheck(dependency);
    });
    
    try {
      await Promise.allSettled(checkPromises);
      
      // Update overall health status
      this.updateOverallHealth();
      
      const duration = performance.now() - startTime;
      
      // Log health check completion
      this.logger.debug(`Health checks completed`, {
        type,
        duration: Math.round(duration),
        status: this.healthStatus.status,
        summary: this.healthStatus.summary,
      });
      
      // Emit health status event
      this.emit('healthCheck', this.healthStatus);
      
    } catch (error) {
      this.logger.error('Error during health checks', error);
    }
  }
  
  private async runSingleHealthCheck(dependency: DependencyConfig): Promise<void> {
    const checkName = dependency.name;
    let attempt = 0;
    let lastError: Error | null = null;
    
    while (attempt <= dependency.retries) {
      try {
        const startTime = performance.now();
        
        // Run the health check with timeout
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Health check timeout')), dependency.timeout);
        });
        
        const checkResult = await Promise.race([
          dependency.healthCheck(),
          timeoutPromise,
        ]);
        
        const duration = performance.now() - startTime;
        
        // Update check result with timing
        checkResult.responseTime = Math.round(duration);
        checkResult.lastCheck = new Date().toISOString();
        
        // Update metadata
        if (!checkResult.metadata) checkResult.metadata = {};
        checkResult.metadata.checkCount = (checkResult.metadata.checkCount || 0) + 1;
        checkResult.metadata.consecutiveFailures = 0;
        
        // Determine status based on response time
        if (checkResult.status === 'healthy') {
          if (duration > healthConfig.unhealthyThreshold) {
            checkResult.status = 'unhealthy';
            checkResult.message = `Response time too high: ${Math.round(duration)}ms`;
          } else if (duration > healthConfig.degradedThreshold) {
            checkResult.status = 'degraded';
            checkResult.message = `Slow response: ${Math.round(duration)}ms`;
          }
        }
        
        // Store the result
        this.healthStatus.checks[checkName] = checkResult;
        
        // Log if status changed or if unhealthy/degraded
        const prevStatus = this.healthStatus.checks[checkName]?.status;
        if (prevStatus !== checkResult.status || checkResult.status !== 'healthy') {
          this.logger.info(`Health check: ${checkName}`, {
            status: checkResult.status,
            responseTime: duration,
            message: checkResult.message,
            statusChanged: prevStatus !== checkResult.status,
          });
        }
        
        return; // Success, exit retry loop
        
      } catch (error) {
        lastError = error as Error;
        attempt++;
        
        if (attempt <= dependency.retries) {
          this.logger.warn(`Health check failed, retrying: ${checkName}`, {
            attempt,
            maxRetries: dependency.retries,
            error: lastError.message,
          });
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
    
    // All retries failed
    const failedCheck: HealthCheck = {
      name: checkName,
      status: 'unhealthy',
      lastCheck: new Date().toISOString(),
      responseTime: dependency.timeout,
      message: lastError?.message || 'Health check failed',
      metadata: {
        checkCount: (this.healthStatus.checks[checkName]?.metadata?.checkCount || 0) + 1,
        consecutiveFailures: (this.healthStatus.checks[checkName]?.metadata?.consecutiveFailures || 0) + 1,
        lastError: lastError?.message,
      },
    };
    
    this.healthStatus.checks[checkName] = failedCheck;
    
    this.logger.error(`Health check failed: ${checkName}`, lastError, {
      retries: dependency.retries,
      timeout: dependency.timeout,
      consecutiveFailures: failedCheck.metadata?.consecutiveFailures,
    });
  }
  
  private updateOverallHealth(): void {
    const checks = Object.values(this.healthStatus.checks);
    
    // Calculate summary
    this.healthStatus.summary = {
      total: checks.length,
      healthy: checks.filter(c => c.status === 'healthy').length,
      degraded: checks.filter(c => c.status === 'degraded').length,
      unhealthy: checks.filter(c => c.status === 'unhealthy').length,
    };
    
    // Determine overall status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    // Check critical dependencies
    for (const [name, dependency] of Array.from(this.dependencies.entries())) {
      if (dependency.critical && dependency.enabled) {
        const check = this.healthStatus.checks[name];
        if (check && check.status === 'unhealthy') {
          overallStatus = 'unhealthy';
          break;
        } else if (check && check.status === 'degraded' && overallStatus === 'healthy') {
          overallStatus = 'degraded';
        }
      }
    }
    
    // If no critical failures, check if majority of services are degraded
    if (overallStatus === 'healthy' && this.healthStatus.summary.degraded > this.healthStatus.summary.healthy) {
      overallStatus = 'degraded';
    }
    
    // Update status and timestamp
    const previousStatus = this.healthStatus.status;
    this.healthStatus.status = overallStatus;
    this.healthStatus.timestamp = new Date().toISOString();
    this.healthStatus.uptime = Date.now() - this.startTime;
    
    // Log status changes
    if (previousStatus !== overallStatus) {
      this.logger.warn(`Application health status changed`, {
        from: previousStatus,
        to: overallStatus,
        summary: this.healthStatus.summary,
      });
      
      this.emit('statusChange', {
        from: previousStatus,
        to: overallStatus,
        timestamp: this.healthStatus.timestamp,
      });
    }
  }
  
  // Individual health check implementations
  
  private async checkDatabaseHealth(): Promise<HealthCheck> {
    try {
      const startTime = performance.now();
      
      // Simple query to test database connectivity
      const result = await db.execute('SELECT 1 as health_check');
      
      const responseTime = performance.now() - startTime;
      
      return {
        name: 'database',
        status: 'healthy',
        lastCheck: new Date().toISOString(),
        responseTime: Math.round(responseTime),
        message: 'Database connection successful',
        details: {
          result: result.rows.length > 0,
          latency: Math.round(responseTime),
        },
      };
    } catch (error) {
      throw new Error(`Database health check failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  private async checkCacheHealth(): Promise<HealthCheck> {
    try {
      const cacheModule = await import('./cache');
      const cache = cacheModule.default || cacheModule.cache;
      const startTime = performance.now();
      
      // Test cache connectivity
      const testKey = `health_check_${Date.now()}`;
      const testValue = 'health_check_value';
      
      await cache.set(testKey, testValue, 60); // 60 seconds TTL
      const retrievedValue = await cache.get(testKey);
      await cache.delete(testKey);
      
      const responseTime = performance.now() - startTime;
      
      if (retrievedValue !== testValue) {
        throw new Error('Cache value mismatch');
      }
      
      return {
        name: 'cache',
        status: 'healthy',
        lastCheck: new Date().toISOString(),
        responseTime: Math.round(responseTime),
        message: 'Cache operations successful',
        details: {
          operations: ['set', 'get', 'delete'],
          latency: Math.round(responseTime),
        },
      };
    } catch (error) {
      throw new Error(`Cache health check failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  private async checkGoogleMapsHealth(): Promise<HealthCheck> {
    try {
      const startTime = performance.now();
      
      // Test Google Maps Geocoding API
      const testAddress = 'São Paulo, SP, Brazil';
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(testAddress)}&key=${config.googleMaps.apiKey}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), healthConfig.externalApiTimeout);
      
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      const responseTime = performance.now() - startTime;
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.status !== 'OK') {
        throw new Error(`API error: ${data.status} - ${data.error_message || 'Unknown error'}`);
      }
      
      return {
        name: 'google_maps',
        status: 'healthy',
        lastCheck: new Date().toISOString(),
        responseTime: Math.round(responseTime),
        message: 'Google Maps API accessible',
        details: {
          status: data.status,
          resultsCount: data.results?.length || 0,
          latency: Math.round(responseTime),
        },
      };
    } catch (error) {
      throw new Error(`Google Maps health check failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  private async checkSupabaseHealth(): Promise<HealthCheck> {
    try {
      const startTime = performance.now();
      
      // Test Supabase connection
      const url = `${config.supabase.url}/rest/v1/`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), healthConfig.externalApiTimeout);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'apikey': config.supabase.anonKey!,
          'Authorization': `Bearer ${config.supabase.anonKey}`,
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      const responseTime = performance.now() - startTime;
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return {
        name: 'supabase',
        status: 'healthy',
        lastCheck: new Date().toISOString(),
        responseTime: Math.round(responseTime),
        message: 'Supabase API accessible',
        details: {
          statusCode: response.status,
          latency: Math.round(responseTime),
        },
      };
    } catch (error) {
      throw new Error(`Supabase health check failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  private async checkFileSystemHealth(): Promise<HealthCheck> {
    try {
      const fs = (await import('node:fs')).promises;
      const path = await import('node:path');
      const startTime = performance.now();
      
      // Test file system operations
      const pathModule = path.default || path;
      const testDir = pathModule.join(process.cwd(), 'temp');
      const testFile = pathModule.join(testDir, `health_check_${Date.now()}.tmp`);
      
      // Ensure temp directory exists
      await fs.mkdir(testDir, { recursive: true });
      
      // Test write operation
      await fs.writeFile(testFile, 'health check test');
      
      // Test read operation
      const content = await fs.readFile(testFile, 'utf8');
      
      // Test delete operation
      await fs.unlink(testFile);
      
      const responseTime = performance.now() - startTime;
      
      if (content !== 'health check test') {
        throw new Error('File content mismatch');
      }
      
      return {
        name: 'file_system',
        status: 'healthy',
        lastCheck: new Date().toISOString(),
        responseTime: Math.round(responseTime),
        message: 'File system operations successful',
        details: {
          operations: ['mkdir', 'writeFile', 'readFile', 'unlink'],
          latency: Math.round(responseTime),
        },
      };
    } catch (error) {
      throw new Error(`File system health check failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  private async checkApplicationHealth(): Promise<HealthCheck> {
    try {
      const startTime = performance.now();
      
      // Check application metrics from performance monitor
      const metrics = performanceMonitor.getMetrics();
      const systemHealth = performanceMonitor.getSystemHealth();
      
      const responseTime = performance.now() - startTime;
      
      // Determine status based on system health
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      let message = 'Application running normally';
      
      if (!systemHealth.healthy) {
        if (systemHealth.issues.some(issue => issue.includes('High memory') || issue.includes('High CPU'))) {
          status = 'degraded';
          message = `Performance issues detected: ${systemHealth.issues.join(', ')}`;
        } else {
          status = 'unhealthy';
          message = `Critical issues detected: ${systemHealth.issues.join(', ')}`;
        }
      }
      
      return {
        name: 'application',
        status,
        lastCheck: new Date().toISOString(),
        responseTime: Math.round(responseTime),
        message,
        details: {
          uptime: metrics.uptime,
          totalRequests: metrics.totalRequests,
          memoryUsage: metrics.system.memoryUsage.percentage,
          cpuUsage: metrics.system.cpuUsage.percentage,
          systemHealthy: systemHealth.healthy,
          issues: systemHealth.issues,
        },
      };
    } catch (error) {
      throw new Error(`Application health check failed: ${error.message}`);
    }
  }
  
  // Public methods
  
  async getHealthStatus(): Promise<HealthStatus> {
    return {
      ...this.healthStatus,
      checks: { ...this.healthStatus.checks }, // Return a copy
    };
  }
  
  async performManualHealthCheck(): Promise<HealthStatus> {
    await this.performHealthChecks('manual');
    return this.getHealthStatus();
  }
  
  async getHealthCheck(name: string): Promise<HealthCheck | null> {
    return this.healthStatus.checks[name] || null;
  }
  
  isHealthy(): boolean {
    return this.healthStatus.status === 'healthy';
  }
  
  isDegraded(): boolean {
    return this.healthStatus.status === 'degraded';
  }
  
  isUnhealthy(): boolean {
    return this.healthStatus.status === 'unhealthy';
  }
  
  getCriticalIssues(): string[] {
    const issues: string[] = [];
    
    for (const [name, dependency] of Array.from(this.dependencies.entries())) {
      if (dependency.critical && dependency.enabled) {
        const check = this.healthStatus.checks[name];
        if (check && check.status === 'unhealthy') {
          issues.push(`${name}: ${check.message || 'Health check failed'}`);
        }
      }
    }
    
    return issues;
  }
  
  // Cleanup method
  shutdown(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    
    if (this.criticalCheckTimer) {
      clearInterval(this.criticalCheckTimer);
    }
    
    this.logger.info('Health monitor shutdown completed');
  }
}

// Global health monitor instance
export const healthMonitor = new HealthMonitor();

// Helper functions for easy integration

export async function getApplicationHealth(): Promise<HealthStatus> {
  return healthMonitor.getHealthStatus();
}

export async function performHealthCheck(): Promise<HealthStatus> {
  return healthMonitor.performManualHealthCheck();
}

export function isApplicationHealthy(): boolean {
  return healthMonitor.isHealthy();
}

export function getApplicationStatus(): 'healthy' | 'degraded' | 'unhealthy' {
  return healthMonitor.getHealthStatus().status;
}

export function getCriticalHealthIssues(): string[] {
  return healthMonitor.getCriticalIssues();
}

// Export the main class and instance
export default healthMonitor;