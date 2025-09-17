/**
 * HEALTH CHECK API ENDPOINTS
 * Enterprise-grade health monitoring and readiness endpoints
 */

import { Router } from 'express';
import { createModuleLogger } from '../core/logger';
import { healthMonitor } from '../core/health';
import { performanceMonitor } from '../core/monitoring';
import { asyncHandler } from '../core/asyncHandler';

const router = Router();
const logger = createModuleLogger('HealthAPI');

/**
 * Basic Health Check Endpoint
 * Returns 200 if application is healthy, 503 if unhealthy
 * Designed for load balancer health checks (fast response)
 */
router.get('/health', asyncHandler(async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Get current health status
    const healthStatus = healthMonitor.getCurrentHealthStatus();
    const responseTime = Date.now() - startTime;
    
    // Determine HTTP status code based on health
    let statusCode = 200;
    if (healthStatus.status === 'unhealthy') {
      statusCode = 503; // Service Unavailable
    } else if (healthStatus.status === 'degraded') {
      statusCode = 200; // Still available but degraded
    }
    
    // Basic response for load balancers
    const response = {
      status: healthStatus.status,
      timestamp: healthStatus.timestamp,
      uptime: healthStatus.uptime,
      responseTime,
      environment: healthStatus.environment,
      version: healthStatus.version,
    };
    
    logger.debug('Basic health check completed', { 
      status: healthStatus.status, 
      responseTime 
    });
    
    res.status(statusCode).json(response);
  } catch (error) {
    logger.error('Health check endpoint failed', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check system unavailable',
      responseTime: Date.now() - startTime,
    });
  }
}));

/**
 * Detailed Health Check Endpoint
 * Returns comprehensive health information including all dependencies
 * Suitable for monitoring systems and dashboards
 */
router.get('/health/detailed', asyncHandler(async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Get complete health status
    const healthStatus = healthMonitor.getCurrentHealthStatus();
    const systemMetrics = performanceMonitor.getMetrics();
    const systemHealth = performanceMonitor.getSystemHealth();
    const responseTime = Date.now() - startTime;
    
    // Determine HTTP status code
    let statusCode = 200;
    if (healthStatus.status === 'unhealthy') {
      statusCode = 503;
    } else if (healthStatus.status === 'degraded') {
      statusCode = 200;
    }
    
    // Detailed response with all health information
    const response = {
      status: healthStatus.status,
      timestamp: healthStatus.timestamp,
      uptime: healthStatus.uptime,
      responseTime,
      environment: healthStatus.environment,
      version: healthStatus.version,
      summary: healthStatus.summary,
      checks: healthStatus.checks,
      system: {
        healthy: systemHealth.healthy,
        issues: systemHealth.issues,
        memory: {
          usage: systemMetrics.system.memoryUsage.percentage,
          heap: systemMetrics.system.memoryUsage.heapUsed,
          external: systemMetrics.system.memoryUsage.external,
        },
        cpu: {
          usage: systemMetrics.system.cpuUsage.percentage,
          user: systemMetrics.system.cpuUsage.user,
          system: systemMetrics.system.cpuUsage.system,
        },
        uptime: systemMetrics.system.uptimeSeconds,
        eventLoopDelay: systemMetrics.system.eventLoopDelay,
        processId: systemMetrics.system.processId,
        nodeVersion: systemMetrics.system.nodeVersion,
      },
      performance: {
        totalRequests: systemMetrics.totalRequests,
        activeConnections: systemMetrics.activeConnections,
        database: {
          queryCount: systemMetrics.database.queryCount,
          averageDuration: systemMetrics.database.averageDuration,
          errorCount: systemMetrics.database.errorCount,
          slowQueryCount: systemMetrics.database.slowQueryCount,
          connectionUtilization: systemMetrics.database.poolUtilization,
        },
        cache: {
          hitRate: systemMetrics.cache.hitRate,
          operationsPerSecond: systemMetrics.cache.hits + systemMetrics.cache.misses + systemMetrics.cache.sets + systemMetrics.cache.deletes,
          errorCount: systemMetrics.cache.errorCount,
        },
      },
    };
    
    logger.debug('Detailed health check completed', { 
      status: healthStatus.status, 
      responseTime,
      checksCount: Object.keys(healthStatus.checks).length,
    });
    
    res.status(statusCode).json(response);
  } catch (error) {
    logger.error('Detailed health check endpoint failed', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Detailed health check system unavailable',
      responseTime: Date.now() - startTime,
    });
  }
}));

/**
 * Readiness Check Endpoint
 * Indicates if the application is ready to serve traffic
 * Used by Kubernetes readiness probes
 */
router.get('/health/ready', asyncHandler(async (req, res) => {
  const startTime = Date.now();
  
  try {
    const healthStatus = healthMonitor.getCurrentHealthStatus();
    const responseTime = Date.now() - startTime;
    
    // Check if critical dependencies are ready
    const criticalChecks = Object.values(healthStatus.checks).filter(check => {
      // Database and application are considered critical for readiness
      return ['database', 'application'].includes(check.name);
    });
    
    const isReady = criticalChecks.every(check => check.status !== 'unhealthy');
    
    const response = {
      ready: isReady,
      status: isReady ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      responseTime,
      criticalChecks: criticalChecks.reduce((acc, check) => {
        acc[check.name] = {
          status: check.status,
          responseTime: check.responseTime,
          message: check.message,
        };
        return acc;
      }, {} as Record<string, any>),
    };
    
    const statusCode = isReady ? 200 : 503;
    
    logger.debug('Readiness check completed', { 
      ready: isReady, 
      responseTime,
      criticalFailures: criticalChecks.filter(c => c.status === 'unhealthy').length,
    });
    
    res.status(statusCode).json(response);
  } catch (error) {
    logger.error('Readiness check endpoint failed', error);
    res.status(503).json({
      ready: false,
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      error: 'Readiness check system unavailable',
    });
  }
}));

/**
 * Liveness Check Endpoint  
 * Indicates if the application process is alive and responding
 * Used by Kubernetes liveness probes
 */
router.get('/health/live', asyncHandler(async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Simple liveness check - if we can respond, we're alive
    const response = {
      alive: true,
      status: 'alive',
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      processId: process.pid,
      uptime: Math.round(process.uptime()),
      memoryUsage: process.memoryUsage().heapUsed,
    };
    
    logger.debug('Liveness check completed', { 
      responseTime: response.responseTime,
      pid: response.processId,
    });
    
    res.status(200).json(response);
  } catch (error) {
    logger.error('Liveness check endpoint failed', error);
    // If we get here, something is seriously wrong
    res.status(503).json({
      alive: false,
      status: 'not_alive',
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      error: 'Liveness check failed',
    });
  }
}));

/**
 * Health History Endpoint
 * Returns historical health data for trending analysis
 */
router.get('/health/history', asyncHandler(async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Get health history from the monitoring system
    const history = healthMonitor.getHealthHistory();
    const responseTime = Date.now() - startTime;
    
    const response = {
      history,
      summary: {
        totalChecks: history.length,
        healthyCount: history.filter(h => h.status === 'healthy').length,
        degradedCount: history.filter(h => h.status === 'degraded').length,
        unhealthyCount: history.filter(h => h.status === 'unhealthy').length,
      },
      responseTime,
      timestamp: new Date().toISOString(),
    };
    
    res.status(200).json(response);
  } catch (error) {
    logger.error('Health history endpoint failed', error);
    res.status(500).json({
      error: 'Health history unavailable',
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
    });
  }
}));

/**
 * Dependency Health Check Endpoint
 * Check health of a specific dependency
 */
router.get('/health/dependency/:name', asyncHandler(async (req, res) => {
  const startTime = Date.now();
  const dependencyName = req.params.name;
  
  try {
    // Force a health check for the specific dependency
    const result = await healthMonitor.checkDependencyHealth(dependencyName);
    const responseTime = Date.now() - startTime;
    
    if (!result) {
      return res.status(404).json({
        error: 'Dependency not found',
        dependency: dependencyName,
        timestamp: new Date().toISOString(),
        responseTime,
      });
    }
    
    // Determine status code based on dependency health
    let statusCode = 200;
    if (result.status === 'unhealthy') {
      statusCode = 503;
    }
    
    const response = {
      dependency: dependencyName,
      ...result,
      responseTime,
    };
    
    res.status(statusCode).json(response);
  } catch (error) {
    logger.error(`Dependency health check failed for ${dependencyName}`, error);
    res.status(500).json({
      error: 'Dependency health check failed',
      dependency: dependencyName,
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
    });
  }
}));

export const healthRoutes = router;