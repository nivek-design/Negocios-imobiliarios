/**
 * METRICS API ENDPOINTS
 * System metrics, performance statistics, and business intelligence
 */

import { Router } from 'express';
import { createModuleLogger } from '../core/logger';
import { performanceMonitor } from '../core/monitoring';
import { healthMonitor } from '../core/health';
import { asyncHandler } from '../core/asyncHandler';
import { isAuthenticated, requireAuth } from '../middlewares/auth';
import { requireAdmin } from '../middlewares/rbac';

const router = Router();
const logger = createModuleLogger('MetricsAPI');

/**
 * System Metrics Endpoint
 * Returns comprehensive system performance metrics
 */
router.get('/metrics', requireAdmin, asyncHandler(async (req, res) => {
  const startTime = Date.now();
  
  try {
    const metrics = performanceMonitor.getMetrics();
    const healthStatus = healthMonitor.getCurrentHealthStatus();
    const systemHealth = performanceMonitor.getSystemHealth();
    const responseTime = Date.now() - startTime;
    
    // Format endpoint metrics as array for easier consumption
    const endpointMetrics = Array.from(metrics.endpoints.entries()).map(([key, data]) => ({
      endpoint: key,
      ...data,
    }));
    
    const response = {
      timestamp: new Date().toISOString(),
      responseTime,
      system: {
        status: healthStatus.status,
        uptime: metrics.uptime,
        startTime: metrics.startTime,
        environment: healthStatus.environment,
        version: healthStatus.version,
        processId: metrics.system.processId,
        nodeVersion: metrics.system.nodeVersion,
        healthy: systemHealth.healthy,
        issues: systemHealth.issues,
      },
      performance: {
        http: {
          totalRequests: metrics.totalRequests,
          activeConnections: metrics.activeConnections,
          endpoints: endpointMetrics.slice(0, 20), // Top 20 endpoints
          topSlowEndpoints: endpointMetrics
            .sort((a, b) => b.averageDuration - a.averageDuration)
            .slice(0, 10),
        },
        database: {
          queryCount: metrics.database.queryCount,
          totalDuration: metrics.database.totalDuration,
          averageDuration: metrics.database.averageDuration,
          slowQueryCount: metrics.database.slowQueryCount,
          errorCount: metrics.database.errorCount,
          errorRate: metrics.database.queryCount > 0 
            ? metrics.database.errorCount / metrics.database.queryCount 
            : 0,
          connectionCount: metrics.database.connectionCount,
          activeConnections: metrics.database.activeConnections,
          poolUtilization: metrics.database.poolUtilization,
          slowQueries: metrics.database.slowQueries.slice(0, 10), // Recent slow queries
        },
        cache: {
          hits: metrics.cache.hits,
          misses: metrics.cache.misses,
          hitRate: metrics.cache.hitRate,
          totalOperations: metrics.cache.hits + metrics.cache.misses + metrics.cache.sets + metrics.cache.deletes,
          operationsPerSecond: (metrics.cache.hits + metrics.cache.misses + metrics.cache.sets + metrics.cache.deletes) / (metrics.uptime / 1000),
          averageDuration: metrics.cache.averageDuration,
          errorCount: metrics.cache.errorCount,
        },
        externalApis: metrics.externalApis,
      },
      resources: {
        memory: {
          used: metrics.system.memoryUsage.used,
          total: metrics.system.memoryUsage.total,
          percentage: metrics.system.memoryUsage.percentage,
          heap: {
            used: metrics.system.memoryUsage.heapUsed,
            total: metrics.system.memoryUsage.heapTotal,
            percentage: (metrics.system.memoryUsage.heapUsed / metrics.system.memoryUsage.heapTotal) * 100,
          },
          external: metrics.system.memoryUsage.external,
          arrayBuffers: metrics.system.memoryUsage.arrayBuffers,
        },
        cpu: {
          user: metrics.system.cpuUsage.user,
          system: metrics.system.cpuUsage.system,
          percentage: metrics.system.cpuUsage.percentage,
        },
        gc: {
          collections: metrics.system.gcMetrics.collections,
          duration: metrics.system.gcMetrics.duration,
          averageDuration: metrics.system.gcMetrics.collections > 0 
            ? metrics.system.gcMetrics.duration / metrics.system.gcMetrics.collections 
            : 0,
          lastCollection: metrics.system.gcMetrics.lastCollection,
        },
        eventLoopDelay: metrics.system.eventLoopDelay,
        uptimeSeconds: metrics.system.uptimeSeconds,
      },
      health: {
        overall: healthStatus.status,
        summary: healthStatus.summary,
        dependencies: healthStatus.checks,
      },
    };
    
    logger.debug('System metrics collected', { 
      responseTime,
      totalEndpoints: endpointMetrics.length,
      totalRequests: metrics.totalRequests,
    });
    
    res.status(200).json(response);
  } catch (error) {
    logger.error('Metrics endpoint failed', error);
    res.status(500).json({
      error: 'Metrics collection failed',
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
    });
  }
}));

/**
 * Business Metrics Endpoint
 * Returns business intelligence and operational metrics
 */
router.get('/metrics/business', requireAuth, asyncHandler(async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Import database to get business metrics
    const { db } = await import('../db');
    const metrics = performanceMonitor.getMetrics();
    
    // Calculate business metrics from database
    const [
      propertiesStats,
      inquiriesStats, 
      appointmentsStats,
      userStats
    ] = await Promise.all([
      // Properties metrics
      db.execute(`
        SELECT 
          COUNT(*) as total_properties,
          COUNT(CASE WHEN status = 'available' THEN 1 END) as available_properties,
          COUNT(CASE WHEN status = 'sold' THEN 1 END) as sold_properties,
          COUNT(CASE WHEN status = 'rented' THEN 1 END) as rented_properties,
          AVG(price) as average_price,
          MAX(price) as max_price,
          MIN(price) as min_price
        FROM properties
      `),
      
      // Inquiries metrics  
      db.execute(`
        SELECT 
          COUNT(*) as total_inquiries,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_inquiries,
          COUNT(CASE WHEN status = 'responded' THEN 1 END) as responded_inquiries,
          COUNT(CASE WHEN created_at >= DATE('now', '-1 day') THEN 1 END) as inquiries_last_24h,
          COUNT(CASE WHEN created_at >= DATE('now', '-7 days') THEN 1 END) as inquiries_last_week
        FROM inquiries
      `),
      
      // Appointments metrics
      db.execute(`
        SELECT 
          COUNT(*) as total_appointments,
          COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled_appointments,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_appointments,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_appointments,
          COUNT(CASE WHEN appointment_date >= DATE('now') THEN 1 END) as upcoming_appointments
        FROM appointments
      `),
      
      // User/Session metrics
      db.execute(`
        SELECT 
          COUNT(DISTINCT user_id) as total_users,
          COUNT(CASE WHEN role = 'agent' THEN 1 END) as total_agents,
          COUNT(CASE WHEN role = 'admin' THEN 1 END) as total_admins,
          COUNT(CASE WHEN created_at >= DATE('now', '-30 days') THEN 1 END) as new_users_last_month
        FROM users
      `),
    ]);
    
    const responseTime = Date.now() - startTime;
    
    const response = {
      timestamp: new Date().toISOString(),
      responseTime,
      business: {
        properties: propertiesStats.rows[0] || {},
        inquiries: {
          ...inquiriesStats.rows[0] || {},
          conversionRate: inquiriesStats.rows[0]?.total_inquiries > 0 
            ? (appointmentsStats.rows[0]?.total_appointments || 0) / inquiriesStats.rows[0].total_inquiries 
            : 0,
        },
        appointments: appointmentsStats.rows[0] || {},
        users: userStats.rows[0] || {},
      },
      operational: {
        apiPerformance: {
          totalRequests: metrics.totalRequests,
          averageResponseTime: Array.from(metrics.endpoints.values())
            .reduce((sum, endpoint) => sum + endpoint.averageDuration, 0) / metrics.endpoints.size,
          errorRate: Array.from(metrics.endpoints.values())
            .reduce((sum, endpoint) => sum + endpoint.errorRate, 0) / metrics.endpoints.size,
        },
        systemUtilization: {
          memoryUsage: metrics.system.memoryUsage.percentage,
          cpuUsage: metrics.system.cpuUsage.percentage,
          databaseUtilization: metrics.database.poolUtilization,
          cacheHitRate: metrics.cache.hitRate,
        },
        availability: {
          uptime: metrics.uptime,
          uptimePercentage: 99.9, // Calculate based on downtime tracking
          mtbf: 0, // Mean Time Between Failures - implement based on incident tracking
          mttr: 0, // Mean Time To Recovery - implement based on incident tracking
        },
      },
    };
    
    res.status(200).json(response);
  } catch (error) {
    logger.error('Business metrics endpoint failed', error);
    res.status(500).json({
      error: 'Business metrics collection failed',
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
    });
  }
}));

/**
 * Performance Metrics Endpoint
 * Returns detailed performance statistics and trends
 */
router.get('/metrics/performance', requireAdmin, asyncHandler(async (req, res) => {
  const startTime = Date.now();
  
  try {
    const metrics = performanceMonitor.getMetrics();
    const endpointMetrics = performanceMonitor.getEndpointMetrics();
    const responseTime = Date.now() - startTime;
    
    // Calculate performance trends
    const slowEndpoints = endpointMetrics
      .filter(endpoint => endpoint.averageDuration > 1000) // > 1 second
      .sort((a, b) => b.averageDuration - a.averageDuration);
    
    const errorProneEndpoints = endpointMetrics
      .filter(endpoint => endpoint.errorRate > 0.05) // > 5% error rate
      .sort((a, b) => b.errorRate - a.errorRate);
    
    const response = {
      timestamp: new Date().toISOString(),
      responseTime,
      performance: {
        overview: {
          totalRequests: metrics.totalRequests,
          averageResponseTime: endpointMetrics.reduce((sum, ep) => sum + ep.averageDuration, 0) / endpointMetrics.length,
          requestsPerSecond: metrics.totalRequests / (metrics.uptime / 1000),
          overallErrorRate: endpointMetrics.reduce((sum, ep) => sum + ep.errorRate, 0) / endpointMetrics.length,
        },
        endpoints: {
          total: endpointMetrics.length,
          topByVolume: endpointMetrics
            .sort((a, b) => b.count - a.count)
            .slice(0, 10),
          slowest: slowEndpoints.slice(0, 10),
          errorProne: errorProneEndpoints.slice(0, 10),
        },
        database: {
          performance: {
            queryCount: metrics.database.queryCount,
            averageDuration: metrics.database.averageDuration,
            slowQueryCount: metrics.database.slowQueryCount,
            slowQueryRate: metrics.database.queryCount > 0 
              ? metrics.database.slowQueryCount / metrics.database.queryCount 
              : 0,
          },
          connections: {
            active: metrics.database.activeConnections,
            total: metrics.database.connectionCount,
            utilization: metrics.database.poolUtilization,
          },
          recentSlowQueries: metrics.database.slowQueries.slice(0, 20),
        },
        cache: {
          performance: {
            hitRate: metrics.cache.hitRate,
            averageDuration: metrics.cache.averageDuration,
            totalOperations: metrics.cache.hits + metrics.cache.misses + metrics.cache.sets + metrics.cache.deletes,
          },
          operations: {
            hits: metrics.cache.hits,
            misses: metrics.cache.misses,
            sets: metrics.cache.sets,
            deletes: metrics.cache.deletes,
          },
        },
        system: {
          resources: {
            memory: metrics.system.memoryUsage,
            cpu: metrics.system.cpuUsage,
            gc: metrics.system.gcMetrics,
            eventLoopDelay: metrics.system.eventLoopDelay,
          },
          uptime: {
            processUptime: metrics.system.uptimeSeconds,
            applicationUptime: metrics.uptime,
          },
        },
        externalServices: metrics.externalApis,
      },
    };
    
    res.status(200).json(response);
  } catch (error) {
    logger.error('Performance metrics endpoint failed', error);
    res.status(500).json({
      error: 'Performance metrics collection failed',
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
    });
  }
}));

/**
 * Resource Utilization Endpoint
 * Returns current resource usage and trends
 */
router.get('/metrics/resources', requireAdmin, asyncHandler(async (req, res) => {
  const startTime = Date.now();
  
  try {
    const metrics = performanceMonitor.getMetrics();
    const systemHealth = performanceMonitor.getSystemHealth();
    const responseTime = Date.now() - startTime;
    
    const response = {
      timestamp: new Date().toISOString(),
      responseTime,
      resources: {
        overall: {
          healthy: systemHealth.healthy,
          issues: systemHealth.issues,
        },
        memory: {
          system: {
            used: metrics.system.memoryUsage.used,
            total: metrics.system.memoryUsage.total,
            percentage: metrics.system.memoryUsage.percentage,
            available: metrics.system.memoryUsage.total - metrics.system.memoryUsage.used,
          },
          heap: {
            used: metrics.system.memoryUsage.heapUsed,
            total: metrics.system.memoryUsage.heapTotal,
            percentage: (metrics.system.memoryUsage.heapUsed / metrics.system.memoryUsage.heapTotal) * 100,
          },
          external: metrics.system.memoryUsage.external,
          arrayBuffers: metrics.system.memoryUsage.arrayBuffers,
        },
        cpu: {
          current: metrics.system.cpuUsage.percentage,
          user: metrics.system.cpuUsage.user,
          system: metrics.system.cpuUsage.system,
        },
        eventLoop: {
          delay: metrics.system.eventLoopDelay,
          status: metrics.system.eventLoopDelay > 50 ? 'degraded' : 'healthy',
        },
        gc: {
          collections: metrics.system.gcMetrics.collections,
          totalDuration: metrics.system.gcMetrics.duration,
          averageDuration: metrics.system.gcMetrics.collections > 0 
            ? metrics.system.gcMetrics.duration / metrics.system.gcMetrics.collections 
            : 0,
          lastCollection: metrics.system.gcMetrics.lastCollection,
        },
        connections: {
          active: metrics.activeConnections,
          database: {
            active: metrics.database.activeConnections,
            total: metrics.database.connectionCount,
            utilization: metrics.database.poolUtilization,
          },
        },
      },
      thresholds: {
        memory: {
          warning: 80,
          critical: 90,
          current: metrics.system.memoryUsage.percentage,
        },
        cpu: {
          warning: 70,
          critical: 85,
          current: metrics.system.cpuUsage.percentage,
        },
        eventLoop: {
          warning: 50,
          critical: 100,
          current: metrics.system.eventLoopDelay,
        },
      },
    };
    
    res.status(200).json(response);
  } catch (error) {
    logger.error('Resource metrics endpoint failed', error);
    res.status(500).json({
      error: 'Resource metrics collection failed',
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
    });
  }
}));

/**
 * Prometheus-compatible Metrics Endpoint
 * Returns metrics in Prometheus exposition format
 */
router.get('/metrics/prometheus', requireAdmin, asyncHandler(async (req, res) => {
  const startTime = Date.now();
  
  try {
    const metrics = performanceMonitor.getMetrics();
    const healthStatus = healthMonitor.getCurrentHealthStatus();
    
    // Generate Prometheus-compatible metrics
    const prometheusMetrics = [
      '# HELP app_info Application information',
      '# TYPE app_info gauge',
      `app_info{version="${healthStatus.version}",environment="${healthStatus.environment}"} 1`,
      '',
      '# HELP app_uptime_seconds Application uptime in seconds',
      '# TYPE app_uptime_seconds gauge',
      `app_uptime_seconds ${metrics.uptime / 1000}`,
      '',
      '# HELP http_requests_total Total number of HTTP requests',
      '# TYPE http_requests_total counter',
      `http_requests_total ${metrics.totalRequests}`,
      '',
      '# HELP http_request_duration_seconds HTTP request duration in seconds',
      '# TYPE http_request_duration_seconds histogram',
    ];
    
    // Add endpoint-specific metrics
    for (const [endpoint, data] of metrics.endpoints.entries()) {
      const [method, path] = endpoint.split(' ');
      prometheusMetrics.push(
        `http_request_duration_seconds_bucket{method="${method}",path="${path}",le="0.1"} ${data.durations.filter(d => d <= 100).length}`,
        `http_request_duration_seconds_bucket{method="${method}",path="${path}",le="0.5"} ${data.durations.filter(d => d <= 500).length}`,
        `http_request_duration_seconds_bucket{method="${method}",path="${path}",le="1"} ${data.durations.filter(d => d <= 1000).length}`,
        `http_request_duration_seconds_bucket{method="${method}",path="${path}",le="5"} ${data.durations.filter(d => d <= 5000).length}`,
        `http_request_duration_seconds_bucket{method="${method}",path="${path}",le="+Inf"} ${data.durations.length}`,
        `http_request_duration_seconds_sum{method="${method}",path="${path}"} ${data.totalDuration / 1000}`,
        `http_request_duration_seconds_count{method="${method}",path="${path}"} ${data.count}`,
      );
    }
    
    // Add system metrics
    prometheusMetrics.push(
      '',
      '# HELP system_memory_usage_percentage System memory usage percentage',
      '# TYPE system_memory_usage_percentage gauge',
      `system_memory_usage_percentage ${metrics.system.memoryUsage.percentage}`,
      '',
      '# HELP system_cpu_usage_percentage System CPU usage percentage',
      '# TYPE system_cpu_usage_percentage gauge',
      `system_cpu_usage_percentage ${metrics.system.cpuUsage.percentage}`,
      '',
      '# HELP database_connections_active Active database connections',
      '# TYPE database_connections_active gauge',
      `database_connections_active ${metrics.database.activeConnections}`,
      '',
      '# HELP database_query_duration_seconds Database query duration in seconds',
      '# TYPE database_query_duration_seconds gauge',
      `database_query_duration_seconds ${metrics.database.averageDuration / 1000}`,
    );
    
    const responseTime = Date.now() - startTime;
    
    res.set('Content-Type', 'text/plain; version=0.0.4');
    res.status(200).send(prometheusMetrics.join('\n'));
    
    logger.debug('Prometheus metrics generated', { 
      responseTime,
      metricsCount: prometheusMetrics.length,
    });
  } catch (error) {
    logger.error('Prometheus metrics endpoint failed', error);
    res.status(500).send('# Error generating metrics\n');
  }
}));

export const metricsRoutes = router;