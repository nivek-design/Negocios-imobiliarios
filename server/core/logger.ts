/**
 * COMPREHENSIVE STRUCTURED LOGGING SYSTEM
 * Professional-grade logging with winston, context tracking, and performance monitoring
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { config } from './config';
import { Request } from 'express';
import { performance } from 'perf_hooks';
import { nanoid } from 'nanoid';

// Extended logging configuration
export const loggingConfig = {
  // Log levels: error, warn, info, http, verbose, debug, silly
  level: process.env.LOG_LEVEL || (config.isDevelopment ? 'debug' : 'info'),
  
  // File logging configuration
  files: {
    maxSize: process.env.LOG_MAX_SIZE || '20m',
    maxFiles: process.env.LOG_MAX_FILES || '14d',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    createSymlink: true,
    symlinkName: 'current.log',
  },
  
  // Console output configuration
  console: {
    colorize: config.isDevelopment,
    prettyPrint: config.isDevelopment,
    timestamp: true,
  },
  
  // Error logging specific configuration
  error: {
    maxSize: process.env.ERROR_LOG_MAX_SIZE || '50m',
    maxFiles: process.env.ERROR_LOG_MAX_FILES || '30d',
    level: 'error',
  },
  
  // Security audit logging
  security: {
    enabled: process.env.SECURITY_LOGGING_ENABLED !== 'false',
    maxSize: process.env.SECURITY_LOG_MAX_SIZE || '100m',
    maxFiles: process.env.SECURITY_LOG_MAX_FILES || '90d',
  },
  
  // Performance logging
  performance: {
    enabled: process.env.PERFORMANCE_LOGGING_ENABLED !== 'false',
    slowQueryThreshold: parseInt(process.env.SLOW_QUERY_THRESHOLD || '1000', 10), // 1 second
    slowRequestThreshold: parseInt(process.env.SLOW_REQUEST_THRESHOLD || '2000', 10), // 2 seconds
  },
  
  // Sensitive data filtering
  sensitiveFields: [
    'password', 'token', 'secret', 'key', 'authorization', 
    'cookie', 'session', 'jwt', 'auth', 'credential',
    'email', 'phone', 'cpf', 'rg', 'passport'
  ],
} as const;

// Log context interface for structured logging
export interface LogContext {
  requestId?: string;
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  ip?: string;
  method?: string;
  path?: string;
  module?: string;
  operation?: string;
  duration?: number;
  statusCode?: number;
  timestamp?: string;
  metadata?: Record<string, any>;
}

// Performance measurement interface
export interface PerformanceMetrics {
  operation: string;
  duration: number;
  timestamp: string;
  success: boolean;
  context?: LogContext;
  details?: Record<string, any>;
}

// Security event interface
export interface SecurityEvent {
  type: 'AUTH_ATTEMPT' | 'AUTH_FAILURE' | 'AUTHORIZATION_FAILURE' | 'SUSPICIOUS_ACTIVITY' | 'RATE_LIMIT_HIT' | 'IP_BLOCKED' | 'DATA_ACCESS';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  userId?: string;
  ip?: string;
  userAgent?: string;
  details: Record<string, any>;
  timestamp?: string;
}

// Business event interface
export interface BusinessEvent {
  type: 'PROPERTY_VIEWED' | 'PROPERTY_CREATED' | 'PROPERTY_UPDATED' | 'INQUIRY_SENT' | 'APPOINTMENT_SCHEDULED' | 'USER_REGISTERED' | 'USER_LOGIN';
  userId?: string;
  resourceId?: string;
  details: Record<string, any>;
  timestamp?: string;
}

// Custom log format for structured JSON
const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
    const logEntry = {
      timestamp,
      level,
      message,
      service: 'kalross-real-estate',
      environment: config.nodeEnv,
      ...(context || {}),
      ...meta
    };
    
    // Filter sensitive data
    return JSON.stringify(filterSensitiveData(logEntry));
  })
);

// Development-friendly console format
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
    const contextStr = context?.requestId ? ` [${context.requestId.slice(0, 8)}]` : ' [system]';
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp}${contextStr} ${level}: ${message}${metaStr}`;
  })
);

// Filter sensitive data from logs
function filterSensitiveData(obj: any): any {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(filterSensitiveData);
  }
  
  const filtered: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (loggingConfig.sensitiveFields.some(field => lowerKey.includes(field))) {
      filtered[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      filtered[key] = filterSensitiveData(value);
    } else {
      filtered[key] = value;
    }
  }
  
  return filtered;
}

// Create winston logger instance
const createLogger = (): winston.Logger => {
  const transports: winston.transport[] = [];
  
  // Console transport (always enabled in development)
  if (config.isDevelopment) {
    transports.push(
      new winston.transports.Console({
        format: consoleFormat,
        level: loggingConfig.level,
      })
    );
  }
  
  // File transports for production and development
  if (config.isProduction || process.env.ENABLE_FILE_LOGGING === 'true') {
    // General application logs with rotation
    transports.push(
      new DailyRotateFile({
        filename: 'logs/application-%DATE%.log',
        datePattern: loggingConfig.files.datePattern,
        maxSize: loggingConfig.files.maxSize,
        maxFiles: loggingConfig.files.maxFiles,
        zippedArchive: loggingConfig.files.zippedArchive,
        createSymlink: loggingConfig.files.createSymlink,
        symlinkName: loggingConfig.files.symlinkName,
        format: jsonFormat,
        level: loggingConfig.level,
      })
    );
    
    // Error-only logs with longer retention
    transports.push(
      new DailyRotateFile({
        filename: 'logs/error-%DATE%.log',
        datePattern: loggingConfig.files.datePattern,
        maxSize: loggingConfig.error.maxSize,
        maxFiles: loggingConfig.error.maxFiles,
        zippedArchive: true,
        format: jsonFormat,
        level: 'error',
      })
    );
    
    // Security audit logs (if enabled)
    if (loggingConfig.security.enabled) {
      transports.push(
        new DailyRotateFile({
          filename: 'logs/security-%DATE%.log',
          datePattern: loggingConfig.files.datePattern,
          maxSize: loggingConfig.security.maxSize,
          maxFiles: loggingConfig.security.maxFiles,
          zippedArchive: true,
          format: jsonFormat,
          level: 'info',
        })
      );
    }
    
    // Performance logs (if enabled)
    if (loggingConfig.performance.enabled) {
      transports.push(
        new DailyRotateFile({
          filename: 'logs/performance-%DATE%.log',
          datePattern: loggingConfig.files.datePattern,
          maxSize: loggingConfig.files.maxSize,
          maxFiles: loggingConfig.files.maxFiles,
          zippedArchive: true,
          format: jsonFormat,
          level: 'info',
        })
      );
    }
  }
  
  return winston.createLogger({
    level: loggingConfig.level,
    format: jsonFormat,
    transports,
    // Don't exit on handled exceptions
    exitOnError: false,
    // Handle uncaught exceptions
    handleExceptions: true,
    handleRejections: true,
  });
};

// Global logger instance
export const logger = createLogger();

// Enhanced logger class with context management
export class ContextualLogger {
  private context: LogContext;
  
  constructor(initialContext: LogContext = {}) {
    this.context = { ...initialContext };
  }
  
  // Update context
  updateContext(newContext: Partial<LogContext>): void {
    this.context = { ...this.context, ...newContext };
  }
  
  // Get current context
  getContext(): LogContext {
    return { ...this.context };
  }
  
  // Log methods with automatic context injection
  error(message: string, error?: Error | any, metadata?: Record<string, any>): void {
    logger.error(message, {
      context: this.context,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
      ...metadata,
    });
  }
  
  warn(message: string, metadata?: Record<string, any>): void {
    logger.warn(message, {
      context: this.context,
      ...metadata,
    });
  }
  
  info(message: string, metadata?: Record<string, any>): void {
    logger.info(message, {
      context: this.context,
      ...metadata,
    });
  }
  
  debug(message: string, metadata?: Record<string, any>): void {
    logger.debug(message, {
      context: this.context,
      ...metadata,
    });
  }
  
  // Specialized logging methods
  
  // Log business events
  logBusinessEvent(event: BusinessEvent): void {
    this.info('Business event occurred', {
      businessEvent: {
        ...event,
        timestamp: event.timestamp || new Date().toISOString(),
      },
    });
  }
  
  // Log security events
  logSecurityEvent(event: SecurityEvent): void {
    const logLevel = event.severity === 'CRITICAL' ? 'error' : 
                    event.severity === 'HIGH' ? 'warn' : 'info';
                    
    logger[logLevel]('Security event detected', {
      context: this.context,
      securityEvent: {
        ...event,
        timestamp: event.timestamp || new Date().toISOString(),
      },
    });
  }
  
  // Log performance metrics
  logPerformance(metrics: PerformanceMetrics): void {
    const isSlowOperation = metrics.duration > loggingConfig.performance.slowRequestThreshold;
    const logLevel = isSlowOperation ? 'warn' : 'info';
    
    logger[logLevel](`Performance: ${metrics.operation}`, {
      context: { ...this.context, ...metrics.context },
      performance: {
        ...metrics,
        timestamp: metrics.timestamp || new Date().toISOString(),
        slow: isSlowOperation,
      },
    });
  }
  
  // Database operation logging
  logDatabaseOperation(operation: string, query: string, duration: number, success: boolean, metadata?: Record<string, any>): void {
    const isSlowQuery = duration > loggingConfig.performance.slowQueryThreshold;
    const logLevel = !success ? 'error' : isSlowQuery ? 'warn' : 'debug';
    
    logger[logLevel](`Database ${operation}`, {
      context: this.context,
      database: {
        operation,
        query: query.length > 200 ? query.substring(0, 197) + '...' : query,
        duration,
        success,
        slow: isSlowQuery,
        timestamp: new Date().toISOString(),
      },
      ...metadata,
    });
  }
  
  // Cache operation logging
  logCacheOperation(operation: 'HIT' | 'MISS' | 'SET' | 'DELETE', key: string, duration?: number, metadata?: Record<string, any>): void {
    this.debug(`Cache ${operation}`, {
      cache: {
        operation,
        key: key.length > 50 ? key.substring(0, 47) + '...' : key,
        duration,
        timestamp: new Date().toISOString(),
      },
      ...metadata,
    });
  }
  
  // External API call logging
  logExternalApiCall(service: string, endpoint: string, method: string, duration: number, statusCode: number, success: boolean): void {
    const logLevel = !success ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    
    logger[logLevel](`External API call: ${service}`, {
      context: this.context,
      externalApi: {
        service,
        endpoint,
        method,
        duration,
        statusCode,
        success,
        timestamp: new Date().toISOString(),
      },
    });
  }
}

// Utility functions for request context extraction
export function extractRequestContext(req: Request): LogContext {
  return {
    requestId: req.headers['x-request-id'] as string || nanoid(10),
    userId: (req as any).user?.id,
    sessionId: req.sessionID,
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.connection.remoteAddress,
    method: req.method,
    path: req.path,
    timestamp: new Date().toISOString(),
  };
}

// Performance measurement utility
export class PerformanceTimer {
  private startTime: number;
  private operation: string;
  private context?: LogContext;
  
  constructor(operation: string, context?: LogContext) {
    this.operation = operation;
    this.context = context;
    this.startTime = performance.now();
  }
  
  end(success: boolean = true, details?: Record<string, any>): PerformanceMetrics {
    const duration = Math.round(performance.now() - this.startTime);
    
    const metrics: PerformanceMetrics = {
      operation: this.operation,
      duration,
      timestamp: new Date().toISOString(),
      success,
      context: this.context,
      details,
    };
    
    return metrics;
  }
}

// Factory function to create contextual logger from request
export function createRequestLogger(req: Request): ContextualLogger {
  const context = extractRequestContext(req);
  return new ContextualLogger(context);
}

// Factory function to create module-specific logger
export function createModuleLogger(module: string, context: Partial<LogContext> = {}): ContextualLogger {
  return new ContextualLogger({
    module,
    ...context,
  });
}

// Health check for logging system
export function isLoggingHealthy(): boolean {
  try {
    logger.info('Logging system health check', { healthCheck: true });
    return true;
  } catch (error) {
    console.error('Logging system health check failed:', error);
    return false;
  }
}

// Graceful shutdown of logging system
export async function shutdownLogger(): Promise<void> {
  return new Promise((resolve) => {
    logger.info('Shutting down logging system...');
    logger.on('finish', () => {
      resolve();
    });
    logger.end();
  });
}

// Export default logger
export default logger;