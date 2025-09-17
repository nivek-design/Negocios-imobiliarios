/**
 * ALERTING SYSTEM
 * Advanced notification and escalation management for system alerts
 */

import { EventEmitter } from 'events';
import { createModuleLogger, ContextualLogger } from './logger';
import { config } from './config';
import { ActiveAlert, AlertRule } from './observability';

// Notification interfaces
export interface NotificationChannel {
  id: string;
  name: string;
  type: 'email' | 'webhook' | 'slack' | 'sms';
  config: Record<string, any>;
  enabled: boolean;
  priority: number; // Higher priority channels are tried first
}

export interface NotificationTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  severity: 'critical' | 'warning' | 'info';
  variables: string[]; // Available template variables
}

export interface EscalationPolicy {
  id: string;
  name: string;
  description: string;
  rules: EscalationRule[];
  enabled: boolean;
}

export interface EscalationRule {
  delay: number; // Minutes before escalating
  channels: string[]; // Channel IDs
  repeatInterval?: number; // Minutes between repeated notifications
  maxRepeats?: number; // Maximum number of repeated notifications
}

export interface NotificationHistory {
  id: string;
  alertId: string;
  channelId: string;
  channelType: string;
  severity: 'critical' | 'warning' | 'info';
  subject: string;
  message: string;
  sentAt: string;
  success: boolean;
  error?: string;
  responseTime: number;
}

/**
 * ALERTING SERVICE CLASS
 * Manages notifications, escalations, and alert lifecycle
 */
export class AlertingService extends EventEmitter {
  private logger: ContextualLogger;
  private channels: Map<string, NotificationChannel>;
  private templates: Map<string, NotificationTemplate>;
  private escalationPolicies: Map<string, EscalationPolicy>;
  private notificationHistory: NotificationHistory[] = [];
  private escalationTimers: Map<string, NodeJS.Timeout>;
  private repeatTimers: Map<string, NodeJS.Timeout>;
  
  private readonly maxHistorySize = 1000;
  
  constructor() {
    super();
    this.logger = createModuleLogger('AlertingService');
    
    this.channels = new Map();
    this.templates = new Map();
    this.escalationPolicies = new Map();
    this.escalationTimers = new Map();
    this.repeatTimers = new Map();
    
    this.initializeDefaultChannels();
    this.initializeDefaultTemplates();
    this.initializeDefaultEscalationPolicies();
    
    this.logger.info('Alerting service initialized');
  }
  
  private initializeDefaultChannels(): void {
    const defaultChannels: Omit<NotificationChannel, 'id'>[] = [
      {
        name: 'Admin Email',
        type: 'email',
        config: {
          recipients: process.env.ADMIN_EMAIL || 'admin@example.com',
          smtpHost: process.env.SMTP_HOST || 'localhost',
          smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
          smtpUser: process.env.SMTP_USER,
          smtpPassword: process.env.SMTP_PASSWORD,
          fromEmail: process.env.FROM_EMAIL || 'alerts@system.com',
        },
        enabled: !!process.env.ADMIN_EMAIL,
        priority: 1,
      },
      {
        name: 'Operations Webhook',
        type: 'webhook',
        config: {
          url: process.env.WEBHOOK_URL || '',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': process.env.WEBHOOK_AUTH || '',
          },
          timeout: 10000, // 10 seconds
        },
        enabled: !!process.env.WEBHOOK_URL,
        priority: 2,
      },
      {
        name: 'Slack Alerts',
        type: 'slack',
        config: {
          webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
          channel: process.env.SLACK_CHANNEL || '#alerts',
          username: 'Premier Properties Alerts',
          iconEmoji: ':warning:',
        },
        enabled: !!process.env.SLACK_WEBHOOK_URL,
        priority: 3,
      },
    ];
    
    defaultChannels.forEach((channel) => {
      const id = this.generateChannelId();
      this.channels.set(id, { ...channel, id });
    });
    
    this.logger.info(`Initialized ${defaultChannels.filter(c => c.enabled).length} notification channels`);
  }
  
  private initializeDefaultTemplates(): void {
    const defaultTemplates: Omit<NotificationTemplate, 'id'>[] = [
      {
        name: 'Critical Alert',
        subject: '🚨 CRITICAL: {{alertName}} - {{systemName}}',
        body: `
CRITICAL ALERT TRIGGERED

System: {{systemName}}
Alert: {{alertName}}
Description: {{description}}
Current Value: {{currentValue}}
Threshold: {{threshold}}
Triggered At: {{triggeredAt}}
Duration: {{duration}}

Impact: This is a critical system issue that requires immediate attention.

Details:
- Metric: {{metric}}
- Severity: {{severity}}
- Environment: {{environment}}
- Server: {{hostname}}

View Dashboard: {{dashboardUrl}}

This alert will continue to escalate until acknowledged and resolved.
        `,
        severity: 'critical',
        variables: ['alertName', 'systemName', 'description', 'currentValue', 'threshold', 'triggeredAt', 'duration', 'metric', 'severity', 'environment', 'hostname', 'dashboardUrl'],
      },
      {
        name: 'Warning Alert',
        subject: '⚠️ WARNING: {{alertName}} - {{systemName}}',
        body: `
WARNING ALERT TRIGGERED

System: {{systemName}}
Alert: {{alertName}}
Description: {{description}}
Current Value: {{currentValue}}
Threshold: {{threshold}}
Triggered At: {{triggeredAt}}

This is a warning that system performance may be degraded.

Details:
- Metric: {{metric}}
- Severity: {{severity}}
- Environment: {{environment}}

View Dashboard: {{dashboardUrl}}
        `,
        severity: 'warning',
        variables: ['alertName', 'systemName', 'description', 'currentValue', 'threshold', 'triggeredAt', 'metric', 'severity', 'environment', 'dashboardUrl'],
      },
      {
        name: 'Info Alert',
        subject: 'ℹ️ INFO: {{alertName}} - {{systemName}}',
        body: `
INFORMATION ALERT

System: {{systemName}}
Alert: {{alertName}}
Description: {{description}}
Current Value: {{currentValue}}
Triggered At: {{triggeredAt}}

This is an informational alert for your awareness.

Details:
- Metric: {{metric}}
- Environment: {{environment}}

View Dashboard: {{dashboardUrl}}
        `,
        severity: 'info',
        variables: ['alertName', 'systemName', 'description', 'currentValue', 'triggeredAt', 'metric', 'environment', 'dashboardUrl'],
      },
      {
        name: 'Alert Resolved',
        subject: '✅ RESOLVED: {{alertName}} - {{systemName}}',
        body: `
ALERT RESOLVED

System: {{systemName}}
Alert: {{alertName}}
Resolved At: {{resolvedAt}}
Duration: {{duration}}

The alert has been automatically resolved.

Details:
- Original Trigger: {{triggeredAt}}
- Total Duration: {{duration}}
- Environment: {{environment}}

View Dashboard: {{dashboardUrl}}
        `,
        severity: 'info',
        variables: ['alertName', 'systemName', 'resolvedAt', 'duration', 'triggeredAt', 'environment', 'dashboardUrl'],
      },
    ];
    
    defaultTemplates.forEach((template) => {
      const id = this.generateTemplateId();
      this.templates.set(id, { ...template, id });
    });
    
    this.logger.info(`Initialized ${defaultTemplates.length} notification templates`);
  }
  
  private initializeDefaultEscalationPolicies(): void {
    const defaultPolicies: Omit<EscalationPolicy, 'id'>[] = [
      {
        name: 'Critical System Issues',
        description: 'Immediate notification with escalation for critical system issues',
        enabled: true,
        rules: [
          {
            delay: 0, // Immediate notification
            channels: Array.from(this.channels.entries())
              .filter(([_, channel]) => channel.enabled && channel.priority <= 2)
              .map(([id, _]) => id),
          },
          {
            delay: 15, // Escalate after 15 minutes if not acknowledged
            channels: Array.from(this.channels.keys()),
            repeatInterval: 30, // Repeat every 30 minutes
            maxRepeats: 3,
          },
        ],
      },
      {
        name: 'Performance Degradation',
        description: 'Gradual escalation for performance issues',
        enabled: true,
        rules: [
          {
            delay: 0,
            channels: Array.from(this.channels.entries())
              .filter(([_, channel]) => channel.type === 'slack' || channel.type === 'webhook')
              .map(([id, _]) => id),
          },
          {
            delay: 30, // Escalate after 30 minutes
            channels: Array.from(this.channels.entries())
              .filter(([_, channel]) => channel.type === 'email')
              .map(([id, _]) => id),
            repeatInterval: 60, // Repeat every hour
            maxRepeats: 2,
          },
        ],
      },
    ];
    
    defaultPolicies.forEach((policy) => {
      const id = this.generatePolicyId();
      this.escalationPolicies.set(id, { ...policy, id });
    });
    
    this.logger.info(`Initialized ${defaultPolicies.length} escalation policies`);
  }
  
  async sendAlert(alert: ActiveAlert, rule?: AlertRule): Promise<void> {
    try {
      this.logger.info('Processing alert for notification', {
        alertId: alert.id,
        severity: alert.severity,
        metric: alert.metric,
      });
      
      // Find appropriate escalation policy
      const escalationPolicy = this.findEscalationPolicy(alert.severity);
      if (!escalationPolicy) {
        this.logger.warn('No escalation policy found for alert', { 
          alertId: alert.id, 
          severity: alert.severity 
        });
        return;
      }
      
      // Execute escalation rules
      for (let i = 0; i < escalationPolicy.rules.length; i++) {
        const escalationRule = escalationPolicy.rules[i];
        
        if (escalationRule.delay === 0) {
          // Immediate notification
          await this.executeEscalationRule(alert, escalationRule);
        } else {
          // Schedule delayed escalation
          this.scheduleEscalation(alert, escalationRule, escalationRule.delay);
        }
      }
      
    } catch (error) {
      this.logger.error('Failed to send alert', error, { alertId: alert.id });
    }
  }
  
  private findEscalationPolicy(severity: 'critical' | 'warning' | 'info'): EscalationPolicy | undefined {
    // For now, use simple policy selection based on severity
    const policies = Array.from(this.escalationPolicies.values()).filter(p => p.enabled);
    
    if (severity === 'critical') {
      return policies.find(p => p.name.toLowerCase().includes('critical')) || policies[0];
    } else {
      return policies.find(p => p.name.toLowerCase().includes('performance')) || policies[1];
    }
  }
  
  private scheduleEscalation(alert: ActiveAlert, rule: EscalationRule, delayMinutes: number): void {
    const timerId = setTimeout(async () => {
      // Check if alert is still active and unacknowledged
      if (!alert.resolved && !alert.acknowledged) {
        await this.executeEscalationRule(alert, rule);
        
        // Schedule repeat notifications if configured
        if (rule.repeatInterval && rule.maxRepeats) {
          this.scheduleRepeatNotifications(alert, rule);
        }
      }
      
      this.escalationTimers.delete(`${alert.id}-${delayMinutes}`);
    }, delayMinutes * 60 * 1000);
    
    this.escalationTimers.set(`${alert.id}-${delayMinutes}`, timerId);
  }
  
  private scheduleRepeatNotifications(alert: ActiveAlert, rule: EscalationRule): void {
    if (!rule.repeatInterval || !rule.maxRepeats) return;
    
    let repeatCount = 0;
    const repeatTimerId = setInterval(async () => {
      if (alert.resolved || alert.acknowledged || repeatCount >= rule.maxRepeats!) {
        clearInterval(repeatTimerId);
        this.repeatTimers.delete(`${alert.id}-repeat`);
        return;
      }
      
      await this.executeEscalationRule(alert, rule);
      repeatCount++;
    }, rule.repeatInterval * 60 * 1000);
    
    this.repeatTimers.set(`${alert.id}-repeat`, repeatTimerId);
  }
  
  private async executeEscalationRule(alert: ActiveAlert, rule: EscalationRule): Promise<void> {
    const enabledChannels = rule.channels
      .map(channelId => this.channels.get(channelId))
      .filter((channel): channel is NotificationChannel => channel?.enabled === true)
      .sort((a, b) => a.priority - b.priority);
    
    for (const channel of enabledChannels) {
      try {
        await this.sendNotification(alert, channel);
      } catch (error) {
        this.logger.error(`Failed to send notification via ${channel.name}`, error);
      }
    }
  }
  
  private async sendNotification(alert: ActiveAlert, channel: NotificationChannel): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Get appropriate template
      const template = this.getTemplateForAlert(alert);
      if (!template) {
        throw new Error('No template found for alert');
      }
      
      // Render notification content
      const content = this.renderTemplate(template, alert);
      
      // Send via specific channel
      await this.sendViaChannel(channel, content, alert);
      
      const responseTime = Date.now() - startTime;
      
      // Record notification history
      const historyEntry: NotificationHistory = {
        id: this.generateNotificationId(),
        alertId: alert.id,
        channelId: channel.id,
        channelType: channel.type,
        severity: alert.severity,
        subject: content.subject,
        message: content.body,
        sentAt: new Date().toISOString(),
        success: true,
        responseTime,
      };
      
      this.addToNotificationHistory(historyEntry);
      
      this.logger.info('Notification sent successfully', {
        alertId: alert.id,
        channelName: channel.name,
        channelType: channel.type,
        responseTime,
      });
      
      this.emit('notificationSent', historyEntry);
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      const historyEntry: NotificationHistory = {
        id: this.generateNotificationId(),
        alertId: alert.id,
        channelId: channel.id,
        channelType: channel.type,
        severity: alert.severity,
        subject: '',
        message: '',
        sentAt: new Date().toISOString(),
        success: false,
        error: errorMessage,
        responseTime,
      };
      
      this.addToNotificationHistory(historyEntry);
      
      this.logger.error(`Failed to send notification via ${channel.name}`, error);
      this.emit('notificationFailed', historyEntry);
    }
  }
  
  private getTemplateForAlert(alert: ActiveAlert): NotificationTemplate | undefined {
    return Array.from(this.templates.values()).find(t => t.severity === alert.severity);
  }
  
  private renderTemplate(template: NotificationTemplate, alert: ActiveAlert): { subject: string; body: string } {
    const variables = {
      alertName: alert.metric,
      systemName: 'Premier Properties',
      description: alert.message,
      currentValue: alert.currentValue.toString(),
      threshold: alert.threshold.toString(),
      triggeredAt: new Date(alert.triggeredAt).toLocaleString(),
      duration: this.calculateDuration(alert.triggeredAt),
      metric: alert.metric,
      severity: alert.severity.toUpperCase(),
      environment: config.nodeEnv,
      hostname: process.env.HOSTNAME || 'unknown',
      dashboardUrl: process.env.DASHBOARD_URL || 'http://localhost:5000/admin/health',
      resolvedAt: alert.resolvedAt ? new Date(alert.resolvedAt).toLocaleString() : '',
    };
    
    let subject = template.subject;
    let body = template.body;
    
    // Replace template variables
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(regex, value);
      body = body.replace(regex, value);
    }
    
    return { subject: subject.trim(), body: body.trim() };
  }
  
  private async sendViaChannel(channel: NotificationChannel, content: { subject: string; body: string }, alert: ActiveAlert): Promise<void> {
    switch (channel.type) {
      case 'email':
        await this.sendEmailNotification(channel, content);
        break;
      case 'webhook':
        await this.sendWebhookNotification(channel, content, alert);
        break;
      case 'slack':
        await this.sendSlackNotification(channel, content, alert);
        break;
      case 'sms':
        await this.sendSmsNotification(channel, content);
        break;
      default:
        throw new Error(`Unsupported channel type: ${channel.type}`);
    }
  }
  
  private async sendEmailNotification(channel: NotificationChannel, content: { subject: string; body: string }): Promise<void> {
    // Use the existing email service if available
    try {
      const { sendEmail } = await import('../emailService');
      
      await sendEmail({
        to: channel.config.recipients,
        subject: content.subject,
        text: content.body,
        from: channel.config.fromEmail,
      });
    } catch (error) {
      // Log but don't fail - email service might not be configured
      this.logger.warn('Email service not available for alert notifications', { error: error instanceof Error ? error.message : String(error) });
      throw new Error('Email service unavailable');
    }
  }
  
  private async sendWebhookNotification(channel: NotificationChannel, content: { subject: string; body: string }, alert: ActiveAlert): Promise<void> {
    const payload = {
      alert: {
        id: alert.id,
        metric: alert.metric,
        severity: alert.severity,
        message: alert.message,
        currentValue: alert.currentValue,
        threshold: alert.threshold,
        triggeredAt: alert.triggeredAt,
      },
      subject: content.subject,
      body: content.body,
      timestamp: new Date().toISOString(),
    };
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), channel.config.timeout || 10000);
    
    try {
      const response = await fetch(channel.config.url, {
        method: channel.config.method || 'POST',
        headers: channel.config.headers || { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Webhook responded with status ${response.status}`);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
  
  private async sendSlackNotification(channel: NotificationChannel, content: { subject: string; body: string }, alert: ActiveAlert): Promise<void> {
    const color = alert.severity === 'critical' ? 'danger' : alert.severity === 'warning' ? 'warning' : 'good';
    
    const payload = {
      channel: channel.config.channel,
      username: channel.config.username,
      icon_emoji: channel.config.iconEmoji,
      attachments: [
        {
          color,
          title: content.subject,
          text: content.body,
          fields: [
            { title: 'Metric', value: alert.metric, short: true },
            { title: 'Current Value', value: alert.currentValue.toString(), short: true },
            { title: 'Threshold', value: alert.threshold.toString(), short: true },
            { title: 'Severity', value: alert.severity.toUpperCase(), short: true },
          ],
          ts: Math.floor(new Date(alert.triggeredAt).getTime() / 1000),
        },
      ],
    };
    
    const response = await fetch(channel.config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      throw new Error(`Slack webhook responded with status ${response.status}`);
    }
  }
  
  private async sendSmsNotification(channel: NotificationChannel, content: { subject: string; body: string }): Promise<void> {
    // Placeholder for SMS implementation
    // This would integrate with Twilio or another SMS service
    throw new Error('SMS notifications not implemented yet');
  }
  
  private calculateDuration(startTime: string, endTime?: string): string {
    const start = new Date(startTime).getTime();
    const end = endTime ? new Date(endTime).getTime() : Date.now();
    const duration = end - start;
    
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }
  
  private addToNotificationHistory(entry: NotificationHistory): void {
    this.notificationHistory.push(entry);
    
    // Maintain history size limit
    if (this.notificationHistory.length > this.maxHistorySize) {
      this.notificationHistory.shift();
    }
  }
  
  private generateChannelId(): string {
    return `channel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private generateTemplateId(): string {
    return `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private generatePolicyId(): string {
    return `policy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private generateNotificationId(): string {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Public API methods
  
  getNotificationChannels(): NotificationChannel[] {
    return Array.from(this.channels.values());
  }
  
  getNotificationHistory(limit: number = 100): NotificationHistory[] {
    return this.notificationHistory.slice(-limit).reverse();
  }
  
  getEscalationPolicies(): EscalationPolicy[] {
    return Array.from(this.escalationPolicies.values());
  }
  
  addNotificationChannel(channel: Omit<NotificationChannel, 'id'>): string {
    const id = this.generateChannelId();
    const newChannel: NotificationChannel = { ...channel, id };
    
    this.channels.set(id, newChannel);
    this.logger.info('Notification channel added', { id, name: channel.name, type: channel.type });
    
    return id;
  }
  
  updateNotificationChannel(id: string, updates: Partial<NotificationChannel>): boolean {
    const channel = this.channels.get(id);
    if (!channel) return false;
    
    Object.assign(channel, updates);
    this.logger.info('Notification channel updated', { id, name: channel.name });
    
    return true;
  }
  
  deleteNotificationChannel(id: string): boolean {
    const deleted = this.channels.delete(id);
    if (deleted) {
      this.logger.info('Notification channel deleted', { id });
    }
    return deleted;
  }
  
  testNotificationChannel(id: string): Promise<boolean> {
    const channel = this.channels.get(id);
    if (!channel) return Promise.resolve(false);
    
    const testAlert: ActiveAlert = {
      id: 'test-alert',
      ruleId: 'test-rule',
      metric: 'test',
      currentValue: 100,
      threshold: 80,
      severity: 'info',
      message: 'This is a test alert to verify notification channel functionality',
      triggeredAt: new Date().toISOString(),
      notificationCount: 0,
      acknowledged: false,
      resolved: false,
    };
    
    return this.sendNotification(testAlert, channel)
      .then(() => true)
      .catch(() => false);
  }
  
  // Cleanup methods
  
  cancelAllEscalations(alertId: string): void {
    // Cancel escalation timers
    for (const [key, timerId] of this.escalationTimers.entries()) {
      if (key.startsWith(alertId)) {
        clearTimeout(timerId);
        this.escalationTimers.delete(key);
      }
    }
    
    // Cancel repeat timers
    for (const [key, timerId] of this.repeatTimers.entries()) {
      if (key.startsWith(alertId)) {
        clearInterval(timerId);
        this.repeatTimers.delete(key);
      }
    }
  }
  
  shutdown(): void {
    // Cancel all timers
    for (const timerId of this.escalationTimers.values()) {
      clearTimeout(timerId);
    }
    
    for (const timerId of this.repeatTimers.values()) {
      clearInterval(timerId);
    }
    
    this.escalationTimers.clear();
    this.repeatTimers.clear();
    
    this.logger.info('Alerting service shutdown completed');
  }
}

// Global alerting service instance
export const alertingService = new AlertingService();