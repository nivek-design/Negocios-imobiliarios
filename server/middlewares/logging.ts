/**
 * REQUEST/RESPONSE LOGGING MIDDLEWARE
 * Comprehensive HTTP request logging with performance tracking and context management
 */

import { Request, Response, NextFunction } from 'express';
import { nanoid } from 'nanoid';
import { 
  createRequestLogger, 
  ContextualLogger, 
  PerformanceTimer, 
  extractRequestContext,
  LogContext 
} from '../core/logger';

// Extended request interface to include logging context
declare global {
  namespace Express {
    interface Request {
      requestId: string;
      logger: ContextualLogger;
      startTime: number;
      performanceTimer: PerformanceTimer;
    }
  }
}

// Request logging configuration
const loggingConfig = {
  // Skip logging for these paths
  skipPaths: [
    '/health',
    '/favicon.ico',
    '/robots.txt',
    '/manifest.json',
  ],
  
  // Skip logging for these user agents
  skipUserAgents: [
    'kube-probe',
    'health-check',
    'ELB-HealthChecker',
  ],
  
  // Log body for these methods (be careful with sensitive data)
  logBodyMethods: ['POST', 'PUT', 'PATCH'],
  
  // Maximum body size to log (in bytes)
  maxBodySize: 1024, // 1KB
  
  // Slow request threshold (in milliseconds)
  slowRequestThreshold: parseInt(process.env.SLOW_REQUEST_THRESHOLD || '2000', 10),
  
  // Log response body for these status codes
  logResponseBody: [400, 401, 403, 404, 422, 500, 502, 503],
  
  // Sensitive headers to redact
  sensitiveHeaders: [
    'authorization',
    'cookie',
    'set-cookie',
    'x-api-key',
    'x-auth-token',
  ],
  
  // Sensitive query parameters to redact
  sensitiveParams: [
    'password',
    'token',
    'key',
    'secret',
    'auth',
  ],
} as const;

// Helper function to determine if request should be logged
function shouldLogRequest(req: Request): boolean {
  // Skip certain paths
  if (loggingConfig.skipPaths.includes(req.path)) {
    return false;
  }
  
  // Skip health checks and monitoring bots
  const userAgent = req.headers['user-agent'] || '';
  if (loggingConfig.skipUserAgents.some(agent => userAgent.includes(agent))) {
    return false;
  }
  
  return true;
}

// Helper function to sanitize headers
function sanitizeHeaders(headers: Record<string, string | string[]>): Record<string, string | string[]> {
  const sanitized: Record<string, string | string[]> = {};
  
  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    if (loggingConfig.sensitiveHeaders.includes(lowerKey)) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

// Helper function to sanitize query parameters
function sanitizeQuery(query: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(query)) {
    const lowerKey = key.toLowerCase();
    if (loggingConfig.sensitiveParams.some(param => lowerKey.includes(param))) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

// Helper function to sanitize request body
function sanitizeBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') {
    return body;
  }
  
  const sanitized: any = Array.isArray(body) ? [] : {};
  
  for (const [key, value] of Object.entries(body)) {
    const lowerKey = key.toLowerCase();
    if (loggingConfig.sensitiveParams.some(param => lowerKey.includes(param))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeBody(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

// Helper function to truncate large bodies
function truncateBody(body: any): any {
  const bodyString = JSON.stringify(body);
  if (bodyString.length > loggingConfig.maxBodySize) {
    return {
      _truncated: true,
      _originalSize: bodyString.length,
      _preview: bodyString.substring(0, loggingConfig.maxBodySize / 2),
    };
  }
  return body;
}

/**
 * REQUEST INITIALIZATION MIDDLEWARE
 * Initializes request-specific logging context and performance tracking
 */
export const initializeRequestLogging = (req: Request, res: Response, next: NextFunction): void => {
  // Generate unique request ID
  req.requestId = req.headers['x-request-id'] as string || nanoid(10);
  
  // Set request ID in response headers for tracing
  res.setHeader('X-Request-ID', req.requestId);
  
  // Initialize performance tracking
  req.startTime = Date.now();
  req.performanceTimer = new PerformanceTimer(`${req.method} ${req.path}`);
  
  // Create request-specific logger with context
  req.logger = createRequestLogger(req);
  
  // Update context with additional request information
  req.logger.updateContext({
    requestId: req.requestId,
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.connection.remoteAddress,
    method: req.method,
    path: req.path,
  });
  
  next();
};

/**
 * REQUEST LOGGING MIDDLEWARE
 * Logs incoming HTTP requests with detailed context
 */
export const logRequest = (req: Request, res: Response, next: NextFunction): void => {
  // Skip logging if configured to do so
  if (!shouldLogRequest(req)) {
    return next();
  }
  
  // Prepare request data for logging
  const requestData: any = {
    method: req.method,
    path: req.path,
    query: Object.keys(req.query).length > 0 ? sanitizeQuery(req.query as Record<string, any>) : undefined,
    headers: sanitizeHeaders(req.headers),
    contentType: req.headers['content-type'],
    contentLength: req.headers['content-length'],
    host: req.headers.host,
    referer: req.headers.referer,
    origin: req.headers.origin,
  };
  
  // Log request body for certain methods (be careful with sensitive data)
  if (loggingConfig.logBodyMethods.includes(req.method as any) && req.body) {
    const sanitizedBody = sanitizeBody(req.body);
    requestData.body = truncateBody(sanitizedBody);
  }
  
  // Log the incoming request
  req.logger.info('Incoming HTTP request', {
    request: requestData,
  });
  
  next();
};

/**
 * RESPONSE LOGGING MIDDLEWARE
 * Logs HTTP responses with performance metrics
 */
export const logResponse = (req: Request, res: Response, next: NextFunction): void => {
  // Skip logging if configured to do so
  if (!shouldLogRequest(req)) {
    return next();
  }
  
  // Capture original response methods
  const originalSend = res.send;
  const originalJson = res.json;
  const originalEnd = res.end;
  
  let responseBody: any;
  let responseSent = false;
  
  // Override res.json to capture response body
  res.json = function(body: any): Response {
    if (!responseSent) {
      responseBody = body;
      responseSent = true;
    }
    return originalJson.call(this, body);
  };
  
  // Override res.send to capture response body
  res.send = function(body: any): Response {
    if (!responseSent) {
      responseBody = body;
      responseSent = true;
    }
    return originalSend.call(this, body);
  };
  
  // Override res.end to log when response is finished
  res.end = function(chunk?: any, encoding?: any): Response {
    const that = this;
    if (!responseSent && chunk) {
      responseBody = chunk;
      responseSent = true;
    }
    
    // Calculate request duration
    const duration = Date.now() - req.startTime;
    const performanceMetrics = req.performanceTimer.end(res.statusCode < 400);
    
    // Determine log level based on status code and performance
    let logLevel: 'error' | 'warn' | 'info' = 'info';
    if (res.statusCode >= 500) {
      logLevel = 'error';
    } else if (res.statusCode >= 400 || duration > loggingConfig.slowRequestThreshold) {
      logLevel = 'warn';
    }
    
    // Prepare response data for logging
    const responseData: any = {
      statusCode: res.statusCode,
      statusMessage: res.statusMessage,
      contentType: res.getHeader('content-type'),
      contentLength: res.getHeader('content-length'),
      duration,
      slow: duration > loggingConfig.slowRequestThreshold,
    };
    
    // Log response body for certain status codes
    if (responseBody && loggingConfig.logResponseBody.includes(res.statusCode as any)) {
      try {
        const bodyToLog = typeof responseBody === 'string' 
          ? JSON.parse(responseBody) 
          : responseBody;
        responseData.body = truncateBody(sanitizeBody(bodyToLog));
      } catch {
        responseData.body = truncateBody(responseBody);
      }
    }
    
    // Update logger context with response information
    req.logger.updateContext({
      statusCode: res.statusCode,
      duration,
    });
    
    // Log the response
    const message = `HTTP ${req.method} ${req.path} ${res.statusCode} ${duration}ms`;
    
    switch (logLevel) {
      case 'error':
        req.logger.error(message, null, { response: responseData });
        break;
      case 'warn':
        req.logger.warn(message, { response: responseData });
        break;
      default:
        req.logger.info(message, { response: responseData });
    }
    
    // Log performance metrics
    req.logger.logPerformance(performanceMetrics);
    
    // Call original end method
    return originalEnd.call(that, chunk, encoding);
  } as any;
  
  next();
};

/**
 * ERROR LOGGING MIDDLEWARE
 * Enhanced error logging with request context
 */
export const logError = (error: Error, req: Request, res: Response, next: NextFunction): void => {
  // Ensure logger exists
  if (!req.logger) {
    req.logger = createRequestLogger(req);
  }
  
  // Calculate duration if available
  const duration = req.startTime ? Date.now() - req.startTime : undefined;
  
  // Log the error with full context
  req.logger.error('HTTP request error', error, {
    request: {
      method: req.method,
      path: req.path,
      query: sanitizeQuery(req.query as Record<string, any>),
      headers: sanitizeHeaders(req.headers),
      body: req.body ? truncateBody(sanitizeBody(req.body)) : undefined,
    },
    duration,
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.connection.remoteAddress,
  });
  
  next(error);
};

/**
 * USER ACTIVITY LOGGING MIDDLEWARE
 * Logs user activities for analytics and audit purposes
 */
export const logUserActivity = (activity: string, details?: Record<string, any>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Log user activity after successful response
    const originalEnd = res.end;
    
    res.end = function(chunk?: any, encoding?: any): Response {
      const that = this;
      // Only log if request was successful
      if (res.statusCode < 400) {
        req.logger.logBusinessEvent({
          type: activity as any,
          userId: (req as any).user?.id,
          resourceId: req.params.id,
          details: {
            method: req.method,
            path: req.path,
            query: req.query,
            userAgent: req.headers['user-agent'],
            ip: req.ip,
            statusCode: res.statusCode,
            ...details,
          },
        });
      }
      
      return originalEnd.call(that, chunk, encoding);
    } as any;
    
    next();
  };
};

/**
 * API ENDPOINT PERFORMANCE TRACKER
 * Specialized middleware for tracking API endpoint performance
 */
export const trackApiPerformance = (endpoint: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const timer = new PerformanceTimer(`API ${endpoint}`, req.logger.getContext());
    
    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: any): Response {
      const that = this;
      const metrics = timer.end(res.statusCode < 400, {
        endpoint,
        method: req.method,
        statusCode: res.statusCode,
        path: req.path,
      });
      
      req.logger.logPerformance(metrics);
      return originalEnd.call(that, chunk, encoding);
    } as any;
    
    next();
  };
};

/**
 * SECURITY EVENT LOGGING MIDDLEWARE
 * Logs security-related events like authentication failures
 */
export const logSecurityEvent = (eventType: string, severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    req.logger.logSecurityEvent({
      type: eventType as any,
      severity,
      userId: (req as any).user?.id,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      details: {
        method: req.method,
        path: req.path,
        query: req.query,
        headers: sanitizeHeaders(req.headers),
        timestamp: new Date().toISOString(),
      },
    });
    
    next();
  };
};

/**
 * COMBINED REQUEST/RESPONSE LOGGING MIDDLEWARE
 * Combines all logging middlewares for easy use
 */
export const requestResponseLogger = [
  initializeRequestLogging,
  logRequest,
  logResponse,
];

// Middleware exports are already handled by 'export const' declarations above