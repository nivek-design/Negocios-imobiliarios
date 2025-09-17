/**
 * OBSERVABILITY SYSTEM CONTROLLER
 * Central coordination hub for health monitoring, metrics collection, and alerting
 */

import { EventEmitter } from 'events';
import { createModuleLogger, ContextualLogger } from './logger';
import { healthMonitor, HealthStatus } from './health';
import { performanceMonitor, ApplicationMetrics } from './monitoring';
import { config } from './config';

// Observability interfaces
export interface ObservabilityConfig {
  // Data collection settings
  metricsRetentionDays: number;
  healthHistoryRetention: number;
  slowQueryThreshold: number;
  errorRateThreshold: number;
  
  // Alert settings
  alertingEnabled: boolean;
  alertCooldown: number; // Minutes between duplicate alerts
  escalationDelay: number; // Minutes before escalating alerts
  
  // Dashboard settings
  refreshInterval: number; // Seconds
  realtimeUpdates: boolean;
  
  // Export settings
  prometheusEnabled: boolean;
  exportInterval: number; // Seconds
}

export interface SystemOverview {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  totalRequests: number;
  errorRate: number;
  averageResponseTime: number;
  activeUsers: number;
  systemLoad: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
  };
  alerts: {
    active: number;
    critical: number;
    warning: number;
    info: number;
  };
  lastUpdate: string;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  metric: string;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne';
  threshold: number;
  severity: 'critical' | 'warning' | 'info';
  cooldown: number; // Minutes
  escalation?: {
    delay: number; // Minutes
    targets: string[];
  };
  enabled: boolean;
  lastTriggered?: string;
  triggerCount: number;
}

export interface ActiveAlert {
  id: string;
  ruleId: string;
  metric: string;
  currentValue: number;
  threshold: number;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  triggeredAt: string;
  lastNotified?: string;
  notificationCount: number;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolved: boolean;
  resolvedAt?: string;
}

/**
 * OBSERVABILITY SYSTEM CLASS
 * Coordinates all monitoring and alerting activities
 */
export class ObservabilitySystem extends EventEmitter {
  private logger: ContextualLogger;
  private config: ObservabilityConfig;
  private alertRules: Map<string, AlertRule>;
  private activeAlerts: Map<string, ActiveAlert>;
  private metricsUpdateTimer?: NodeJS.Timeout;
  private alertEvaluationTimer?: NodeJS.Timeout;
  private alertingService?: any; // Will be set during initialization
  
  // Data retention
  private metricsHistory: ApplicationMetrics[] = [];
  private healthHistory: HealthStatus[] = [];
  
  constructor(config?: Partial<ObservabilityConfig>) {
    super();
    this.logger = createModuleLogger('ObservabilitySystem');
    
    // Initialize configuration
    this.config = {
      metricsRetentionDays: parseInt(process.env.METRICS_RETENTION_DAYS || '7', 10),
      healthHistoryRetention: parseInt(process.env.HEALTH_HISTORY_RETENTION || '1000', 10),
      slowQueryThreshold: parseInt(process.env.SLOW_QUERY_THRESHOLD || '1000', 10),
      errorRateThreshold: parseFloat(process.env.ERROR_RATE_THRESHOLD || '0.05'),
      
      alertingEnabled: process.env.ALERTING_ENABLED !== 'false',
      alertCooldown: parseInt(process.env.ALERT_COOLDOWN_MINUTES || '15', 10),
      escalationDelay: parseInt(process.env.ESCALATION_DELAY_MINUTES || '30', 10),
      
      refreshInterval: parseInt(process.env.DASHBOARD_REFRESH_SECONDS || '30', 10),
      realtimeUpdates: process.env.REALTIME_UPDATES !== 'false',
      
      prometheusEnabled: process.env.PROMETHEUS_ENABLED !== 'false',
      exportInterval: parseInt(process.env.EXPORT_INTERVAL_SECONDS || '60', 10),
      
      ...config,
    };
    
    this.alertRules = new Map();
    this.activeAlerts = new Map();
    
    this.setupEventListeners();
    this.initializeDefaultAlertRules();
    this.startPeriodicTasks();
    
    // Initialize alerting service integration after a short delay to avoid circular imports
    setTimeout(() => {
      this.initializeAlertingIntegration();
    }, 1000);
    
    this.logger.info('Observability system initialized', {
      metricsRetention: this.config.metricsRetentionDays,
      alertingEnabled: this.config.alertingEnabled,
      realtimeUpdates: this.config.realtimeUpdates,
    });
  }
  
  private setupEventListeners(): void {
    // Listen to health status changes
    healthMonitor.on('statusChange', (event) => {
      this.handleHealthStatusChange(event);
    });
    
    // Listen to performance events
    performanceMonitor.on('highMemoryUsage', (usage) => {
      this.evaluateAlertRule('memory_usage', usage.percentage);
    });
    
    performanceMonitor.on('highCpuUsage', (usage) => {
      this.evaluateAlertRule('cpu_usage', usage.percentage);
    });
    
    // Listen to system metrics updates
    performanceMonitor.on('systemMetrics', () => {
      this.collectMetrics();
    });
  }
  
  private initializeDefaultAlertRules(): void {
    const defaultRules: Omit<AlertRule, 'id'>[] = [
      {
        name: 'High Memory Usage',
        description: 'System memory usage is above threshold',
        metric: 'memory_usage',
        operator: 'gt',
        threshold: 85,
        severity: 'warning',
        cooldown: 15,
        enabled: true,
        triggerCount: 0,
      },
      {
        name: 'Critical Memory Usage',
        description: 'System memory usage is critically high',
        metric: 'memory_usage',
        operator: 'gt',
        threshold: 95,
        severity: 'critical',
        cooldown: 5,
        escalation: {
          delay: 10,
          targets: ['admin@example.com'],
        },
        enabled: true,
        triggerCount: 0,
      },
      {
        name: 'High CPU Usage',
        description: 'System CPU usage is above threshold',
        metric: 'cpu_usage',
        operator: 'gt',
        threshold: 80,
        severity: 'warning',
        cooldown: 15,
        enabled: true,
        triggerCount: 0,
      },
      {
        name: 'High Error Rate',
        description: 'API error rate is above acceptable threshold',
        metric: 'error_rate',
        operator: 'gt',
        threshold: this.config.errorRateThreshold,
        severity: 'critical',
        cooldown: 10,
        escalation: {
          delay: 15,
          targets: ['ops@example.com'],
        },
        enabled: true,
        triggerCount: 0,
      },
      {
        name: 'Database Connection Issues',
        description: 'Database connection pool utilization is high',
        metric: 'db_pool_utilization',
        operator: 'gt',
        threshold: 90,
        severity: 'warning',
        cooldown: 10,
        enabled: true,
        triggerCount: 0,
      },
      {
        name: 'Slow Response Times',
        description: 'Average API response time is above threshold',
        metric: 'avg_response_time',
        operator: 'gt',
        threshold: 2000, // 2 seconds
        severity: 'warning',
        cooldown: 20,
        enabled: true,
        triggerCount: 0,
      },
    ];
    
    defaultRules.forEach((rule) => {
      const id = this.generateAlertId();
      this.alertRules.set(id, { ...rule, id });
    });
    
    this.logger.info(`Initialized ${defaultRules.length} default alert rules`);
  }
  
  private startPeriodicTasks(): void {
    // Metrics collection
    this.metricsUpdateTimer = setInterval(() => {
      this.collectMetrics();
    }, this.config.refreshInterval * 1000);
    
    // Alert evaluation
    if (this.config.alertingEnabled) {
      this.alertEvaluationTimer = setInterval(() => {
        this.evaluateAllAlerts();
      }, 60000); // Check every minute
    }
  }
  
  private async collectMetrics(): Promise<void> {
    try {
      const metrics = performanceMonitor.getMetrics();
      
      // Store metrics history
      this.metricsHistory.push({
        ...metrics,
        endpoints: new Map(metrics.endpoints), // Deep copy
      });
      
      // Maintain retention limit
      const retentionLimit = this.config.metricsRetentionDays * 24 * 60; // Convert to minutes
      const cutoffTime = Date.now() - (retentionLimit * 60 * 1000);
      
      this.metricsHistory = this.metricsHistory.filter(m => {
        const timestamp = new Date(m.startTime).getTime();
        return timestamp > cutoffTime;
      });
      
      // Emit metrics update event
      this.emit('metricsUpdated', metrics);
      
    } catch (error) {
      this.logger.error('Failed to collect metrics', error);
    }
  }
  
  private handleHealthStatusChange(event: any): void {
    this.logger.info('Health status changed', event);
    
    // Evaluate health-related alerts
    if (event.to === 'unhealthy') {
      this.triggerAlert('system_health', 'System health is unhealthy', 'critical', 0);
    } else if (event.to === 'degraded') {
      this.triggerAlert('system_health', 'System health is degraded', 'warning', 0);
    }
    
    this.emit('healthStatusChanged', event);
  }
  
  private evaluateAllAlerts(): void {
    if (!this.config.alertingEnabled) return;
    
    try {
      const metrics = performanceMonitor.getMetrics();
      
      // Calculate current metric values
      const currentMetrics = {
        memory_usage: metrics.system.memoryUsage.percentage,
        cpu_usage: metrics.system.cpuUsage.percentage,
        db_pool_utilization: metrics.database.poolUtilization * 100,
        error_rate: this.calculateErrorRate(),
        avg_response_time: this.calculateAverageResponseTime(),
      };
      
      // Evaluate each alert rule
      for (const [ruleId, rule] of this.alertRules.entries()) {
        if (!rule.enabled) continue;
        
        const currentValue = currentMetrics[rule.metric as keyof typeof currentMetrics];
        if (currentValue !== undefined) {
          this.evaluateAlertRule(rule.metric, currentValue, ruleId);
        }
      }
      
    } catch (error) {
      this.logger.error('Failed to evaluate alerts', error);
    }
  }
  
  private evaluateAlertRule(metric: string, currentValue: number, ruleId?: string): void {
    const rules = ruleId 
      ? [this.alertRules.get(ruleId)].filter(Boolean) as AlertRule[]
      : Array.from(this.alertRules.values()).filter(rule => rule.metric === metric);
    
    for (const rule of rules) {
      if (!rule.enabled) continue;
      
      const shouldAlert = this.shouldTriggerAlert(rule, currentValue);
      const alertKey = `${rule.id}-${metric}`;
      const existingAlert = this.activeAlerts.get(alertKey);
      
      if (shouldAlert && !existingAlert) {
        // Trigger new alert
        this.triggerAlert(rule.id, rule.description, rule.severity, currentValue, rule.threshold);
      } else if (!shouldAlert && existingAlert && !existingAlert.resolved) {
        // Resolve alert
        this.resolveAlert(alertKey);
      }
    }
  }
  
  private shouldTriggerAlert(rule: AlertRule, currentValue: number): boolean {
    // Check cooldown period
    if (rule.lastTriggered) {
      const lastTriggered = new Date(rule.lastTriggered).getTime();
      const cooldownEnd = lastTriggered + (rule.cooldown * 60 * 1000);
      if (Date.now() < cooldownEnd) {
        return false;
      }
    }
    
    // Evaluate condition
    switch (rule.operator) {
      case 'gt': return currentValue > rule.threshold;
      case 'gte': return currentValue >= rule.threshold;
      case 'lt': return currentValue < rule.threshold;
      case 'lte': return currentValue <= rule.threshold;
      case 'eq': return currentValue === rule.threshold;
      case 'ne': return currentValue !== rule.threshold;
      default: return false;
    }
  }
  
  private triggerAlert(ruleId: string, message: string, severity: 'critical' | 'warning' | 'info', currentValue: number, threshold?: number): void {
    const alertId = this.generateAlertId();
    const alertKey = `${ruleId}-alert`;
    
    const alert: ActiveAlert = {
      id: alertId,
      ruleId,
      metric: ruleId,
      currentValue,
      threshold: threshold || 0,
      severity,
      message,
      triggeredAt: new Date().toISOString(),
      notificationCount: 0,
      acknowledged: false,
      resolved: false,
    };
    
    this.activeAlerts.set(alertKey, alert);
    
    // Update rule statistics
    const rule = this.alertRules.get(ruleId);
    if (rule) {
      rule.lastTriggered = alert.triggeredAt;
      rule.triggerCount++;
    }
    
    this.logger.warn('Alert triggered', {
      alertId,
      ruleId,
      severity,
      message,
      currentValue,
      threshold,
    });
    
    this.emit('alertTriggered', alert);
    
    // Send notifications (implement based on configuration)
    this.sendAlertNotification(alert);
  }
  
  private resolveAlert(alertKey: string): void {
    const alert = this.activeAlerts.get(alertKey);
    if (!alert || alert.resolved) return;
    
    alert.resolved = true;
    alert.resolvedAt = new Date().toISOString();
    
    this.logger.info('Alert resolved', {
      alertId: alert.id,
      ruleId: alert.ruleId,
      duration: new Date(alert.resolvedAt).getTime() - new Date(alert.triggeredAt).getTime(),
    });
    
    this.emit('alertResolved', alert);
  }
  
  private sendAlertNotification(alert: ActiveAlert): void {
    // Placeholder for notification implementation
    // This would integrate with email, Slack, webhooks, etc.
    this.logger.info('Sending alert notification', {
      alertId: alert.id,
      severity: alert.severity,
      message: alert.message,
    });
    
    alert.lastNotified = new Date().toISOString();
    alert.notificationCount++;
  }
  
  private calculateErrorRate(): number {
    const metrics = performanceMonitor.getMetrics();
    const endpoints = Array.from(metrics.endpoints.values());
    
    if (endpoints.length === 0) return 0;
    
    const totalRequests = endpoints.reduce((sum, ep) => sum + ep.count, 0);
    const totalErrors = endpoints.reduce((sum, ep) => sum + ep.errorCount, 0);
    
    return totalRequests > 0 ? totalErrors / totalRequests : 0;
  }
  
  private calculateAverageResponseTime(): number {
    const metrics = performanceMonitor.getMetrics();
    const endpoints = Array.from(metrics.endpoints.values());
    
    if (endpoints.length === 0) return 0;
    
    return endpoints.reduce((sum, ep) => sum + ep.averageDuration, 0) / endpoints.length;
  }
  
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private async initializeAlertingIntegration(): Promise<void> {
    try {
      const { alertingService } = await import('./alerting');
      this.alertingService = alertingService;
      
      // Connect alert events to alerting service
      this.on('alertTriggered', (alert) => {
        if (this.alertingService && this.config.alertingEnabled) {
          this.alertingService.sendAlert(alert);
        }
      });
      
      this.logger.info('Alerting service integration initialized');
    } catch (error) {
      this.logger.warn('Failed to initialize alerting service integration', { 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }
  
  // Public API methods
  
  getSystemOverview(): SystemOverview {
    const metrics = performanceMonitor.getMetrics();
    const healthStatus = healthMonitor.getCurrentHealthStatus();
    const activeAlerts = Array.from(this.activeAlerts.values()).filter(a => !a.resolved);
    
    return {
      status: healthStatus.status,
      uptime: metrics.uptime,
      totalRequests: metrics.totalRequests,
      errorRate: this.calculateErrorRate(),
      averageResponseTime: this.calculateAverageResponseTime(),
      activeUsers: 0, // Implement based on session tracking
      systemLoad: {
        cpu: metrics.system.cpuUsage.percentage,
        memory: metrics.system.memoryUsage.percentage,
        disk: 0, // Implement disk usage monitoring
        network: 0, // Implement network monitoring
      },
      alerts: {
        active: activeAlerts.length,
        critical: activeAlerts.filter(a => a.severity === 'critical').length,
        warning: activeAlerts.filter(a => a.severity === 'warning').length,
        info: activeAlerts.filter(a => a.severity === 'info').length,
      },
      lastUpdate: new Date().toISOString(),
    };
  }
  
  getActiveAlerts(): ActiveAlert[] {
    return Array.from(this.activeAlerts.values())
      .filter(alert => !alert.resolved)
      .sort((a, b) => {
        // Sort by severity, then by triggered time
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        const aSeverity = severityOrder[a.severity];
        const bSeverity = severityOrder[b.severity];
        
        if (aSeverity !== bSeverity) {
          return aSeverity - bSeverity;
        }
        
        return new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime();
      });
  }
  
  getAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values());
  }
  
  addAlertRule(rule: Omit<AlertRule, 'id' | 'triggerCount'>): string {
    const id = this.generateAlertId();
    const newRule: AlertRule = {
      ...rule,
      id,
      triggerCount: 0,
    };
    
    this.alertRules.set(id, newRule);
    this.logger.info('Alert rule added', { id, name: rule.name });
    
    return id;
  }
  
  updateAlertRule(id: string, updates: Partial<AlertRule>): boolean {
    const rule = this.alertRules.get(id);
    if (!rule) return false;
    
    Object.assign(rule, updates);
    this.logger.info('Alert rule updated', { id, name: rule.name });
    
    return true;
  }
  
  deleteAlertRule(id: string): boolean {
    const deleted = this.alertRules.delete(id);
    if (deleted) {
      this.logger.info('Alert rule deleted', { id });
    }
    return deleted;
  }
  
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    for (const [key, alert] of this.activeAlerts.entries()) {
      if (alert.id === alertId) {
        alert.acknowledged = true;
        alert.acknowledgedBy = acknowledgedBy;
        alert.acknowledgedAt = new Date().toISOString();
        
        this.logger.info('Alert acknowledged', { alertId, acknowledgedBy });
        this.emit('alertAcknowledged', alert);
        
        return true;
      }
    }
    
    return false;
  }
  
  getMetricsHistory(hours: number = 24): ApplicationMetrics[] {
    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
    
    return this.metricsHistory.filter(m => {
      const timestamp = new Date(m.startTime).getTime();
      return timestamp > cutoffTime;
    });
  }
  
  // Cleanup method
  shutdown(): void {
    if (this.metricsUpdateTimer) {
      clearInterval(this.metricsUpdateTimer);
    }
    
    if (this.alertEvaluationTimer) {
      clearInterval(this.alertEvaluationTimer);
    }
    
    this.logger.info('Observability system shutdown completed');
  }
}

// Global observability system instance
export const observabilitySystem = new ObservabilitySystem();