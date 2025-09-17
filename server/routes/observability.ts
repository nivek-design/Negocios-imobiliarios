/**
 * OBSERVABILITY API ROUTES
 * Comprehensive observability endpoints combining health, metrics, and alerting
 */

import { Router } from 'express';
import { createModuleLogger } from '../core/logger';
import { observabilitySystem } from '../core/observability';
import { alertingService } from '../core/alerting';
import { asyncHandler } from '../core/asyncHandler';
import { requireAuth } from '../middlewares/auth';
import { healthRoutes } from './health';
import { metricsRoutes } from './metrics';

const router = Router();
const logger = createModuleLogger('ObservabilityAPI');

// Mount health and metrics routes
router.use('/', healthRoutes);
router.use('/', metricsRoutes);

/**
 * System Overview Endpoint
 * Complete system status for dashboard
 */
router.get('/overview', requireAuth, asyncHandler(async (req, res) => {
  const startTime = Date.now();
  
  try {
    const overview = observabilitySystem.getSystemOverview();
    const responseTime = Date.now() - startTime;
    
    const response = {
      ...overview,
      responseTime,
    };
    
    res.status(200).json(response);
    
    logger.debug('System overview requested', { 
      responseTime,
      status: overview.status,
      alerts: overview.alerts.active,
    });
  } catch (error) {
    logger.error('System overview endpoint failed', error);
    res.status(500).json({
      error: 'System overview unavailable',
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
    });
  }
}));

/**
 * Active Alerts Endpoint
 * Get current active alerts
 */
router.get('/alerts', requireAuth, asyncHandler(async (req, res) => {
  const startTime = Date.now();
  
  try {
    const alerts = observabilitySystem.getActiveAlerts();
    const responseTime = Date.now() - startTime;
    
    const response = {
      alerts,
      summary: {
        total: alerts.length,
        critical: alerts.filter(a => a.severity === 'critical').length,
        warning: alerts.filter(a => a.severity === 'warning').length,
        info: alerts.filter(a => a.severity === 'info').length,
      },
      responseTime,
      timestamp: new Date().toISOString(),
    };
    
    res.status(200).json(response);
  } catch (error) {
    logger.error('Active alerts endpoint failed', error);
    res.status(500).json({
      error: 'Active alerts unavailable',
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
    });
  }
}));

/**
 * Alert Rules Management Endpoints
 */
router.get('/alert-rules', requireAuth, asyncHandler(async (req, res) => {
  const rules = observabilitySystem.getAlertRules();
  res.status(200).json({ rules });
}));

router.post('/alert-rules', requireAuth, asyncHandler(async (req, res) => {
  const { name, description, metric, operator, threshold, severity, cooldown, enabled } = req.body;
  
  if (!name || !metric || !operator || threshold === undefined || !severity) {
    return res.status(400).json({
      error: 'Missing required fields: name, metric, operator, threshold, severity',
    });
  }
  
  const ruleId = observabilitySystem.addAlertRule({
    name,
    description: description || '',
    metric,
    operator,
    threshold,
    severity,
    cooldown: cooldown || 15,
    enabled: enabled !== false,
  });
  
  res.status(201).json({ ruleId, message: 'Alert rule created successfully' });
}));

router.put('/alert-rules/:id', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  const updated = observabilitySystem.updateAlertRule(id, updates);
  
  if (!updated) {
    return res.status(404).json({ error: 'Alert rule not found' });
  }
  
  res.status(200).json({ message: 'Alert rule updated successfully' });
}));

router.delete('/alert-rules/:id', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const deleted = observabilitySystem.deleteAlertRule(id);
  
  if (!deleted) {
    return res.status(404).json({ error: 'Alert rule not found' });
  }
  
  res.status(200).json({ message: 'Alert rule deleted successfully' });
}));

/**
 * Alert Management Endpoints
 */
router.post('/alerts/:id/acknowledge', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { acknowledgedBy } = req.body;
  
  if (!acknowledgedBy) {
    return res.status(400).json({ error: 'acknowledgedBy field is required' });
  }
  
  const acknowledged = observabilitySystem.acknowledgeAlert(id, acknowledgedBy);
  
  if (!acknowledged) {
    return res.status(404).json({ error: 'Alert not found' });
  }
  
  res.status(200).json({ message: 'Alert acknowledged successfully' });
}));

/**
 * Notification Channels Management
 */
router.get('/notification-channels', requireAuth, asyncHandler(async (req, res) => {
  const channels = alertingService.getNotificationChannels();
  res.status(200).json({ channels });
}));

router.post('/notification-channels', requireAuth, asyncHandler(async (req, res) => {
  const { name, type, config, enabled, priority } = req.body;
  
  if (!name || !type || !config) {
    return res.status(400).json({
      error: 'Missing required fields: name, type, config',
    });
  }
  
  const channelId = alertingService.addNotificationChannel({
    name,
    type,
    config,
    enabled: enabled !== false,
    priority: priority || 1,
  });
  
  res.status(201).json({ channelId, message: 'Notification channel created successfully' });
}));

router.put('/notification-channels/:id', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  const updated = alertingService.updateNotificationChannel(id, updates);
  
  if (!updated) {
    return res.status(404).json({ error: 'Notification channel not found' });
  }
  
  res.status(200).json({ message: 'Notification channel updated successfully' });
}));

router.delete('/notification-channels/:id', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const deleted = alertingService.deleteNotificationChannel(id);
  
  if (!deleted) {
    return res.status(404).json({ error: 'Notification channel not found' });
  }
  
  res.status(200).json({ message: 'Notification channel deleted successfully' });
}));

router.post('/notification-channels/:id/test', requireAuth, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const success = await alertingService.testNotificationChannel(id);
  
  res.status(200).json({
    success,
    message: success ? 'Test notification sent successfully' : 'Test notification failed',
  });
}));

/**
 * Notification History
 */
router.get('/notification-history', requireAuth, asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 100;
  const history = alertingService.getNotificationHistory(limit);
  
  res.status(200).json({ history });
}));

/**
 * Escalation Policies
 */
router.get('/escalation-policies', requireAuth, asyncHandler(async (req, res) => {
  const policies = alertingService.getEscalationPolicies();
  res.status(200).json({ policies });
}));

/**
 * Metrics History Endpoint
 */
router.get('/metrics/history', requireAuth, asyncHandler(async (req, res) => {
  const hours = parseInt(req.query.hours as string) || 24;
  const history = observabilitySystem.getMetricsHistory(hours);
  
  res.status(200).json({
    history,
    timeRange: `${hours} hours`,
    dataPoints: history.length,
  });
}));

/**
 * Force Health Check Endpoint
 */
router.post('/health/check', requireAuth, asyncHandler(async (req, res) => {
  const { dependencies } = req.body;
  
  try {
    if (dependencies && Array.isArray(dependencies)) {
      // Check specific dependencies
      const results = await Promise.allSettled(
        dependencies.map(dep => import('../core/health').then(({ healthMonitor }) => 
          healthMonitor.checkDependencyHealth(dep)
        ))
      );
      
      const checkResults = results.map((result, index) => ({
        dependency: dependencies[index],
        success: result.status === 'fulfilled',
        result: result.status === 'fulfilled' ? result.value : null,
        error: result.status === 'rejected' ? result.reason?.message : null,
      }));
      
      res.status(200).json({ checkResults });
    } else {
      // Perform full health check
      const { performHealthCheck } = await import('../core/health');
      const healthStatus = await performHealthCheck();
      
      res.status(200).json({ 
        message: 'Health check completed',
        status: healthStatus,
      });
    }
  } catch (error) {
    logger.error('Manual health check failed', error);
    res.status(500).json({
      error: 'Health check failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}));

/**
 * System Configuration Endpoint
 */
router.get('/config', requireAuth, asyncHandler(async (req, res) => {
  const config = {
    health: {
      enabled: true,
      checkInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '60000', 10),
      criticalCheckInterval: parseInt(process.env.CRITICAL_CHECK_INTERVAL || '30000', 10),
    },
    metrics: {
      enabled: true,
      retentionDays: parseInt(process.env.METRICS_RETENTION_DAYS || '7', 10),
      refreshInterval: parseInt(process.env.DASHBOARD_REFRESH_SECONDS || '30', 10),
    },
    alerting: {
      enabled: process.env.ALERTING_ENABLED !== 'false',
      cooldown: parseInt(process.env.ALERT_COOLDOWN_MINUTES || '15', 10),
      escalationDelay: parseInt(process.env.ESCALATION_DELAY_MINUTES || '30', 10),
    },
    notifications: {
      emailEnabled: !!process.env.ADMIN_EMAIL,
      webhookEnabled: !!process.env.WEBHOOK_URL,
      slackEnabled: !!process.env.SLACK_WEBHOOK_URL,
    },
  };
  
  res.status(200).json(config);
}));

/**
 * Error handling for observability routes
 */
router.use((error: any, req: any, res: any, next: any) => {
  logger.error('Observability API error', error);
  
  if (!res.headersSent) {
    res.status(500).json({
      error: 'Internal observability system error',
      timestamp: new Date().toISOString(),
      path: req.path,
    });
  }
});

export const observabilityRoutes = router;