import helmet from 'helmet';
import cors from 'cors';
import { type Request, type Response, type NextFunction } from 'express';
import { config } from '../core/config';
import { AppError } from '../core/errors';
import { body, validationResult, type ValidationChain } from 'express-validator';

/**
 * COMPREHENSIVE SECURITY MIDDLEWARE
 * 
 * Implements multiple layers of security protection:
 * 1. Security headers with Helmet
 * 2. CORS configuration
 * 3. Input sanitization and XSS protection
 * 4. Attack protection (SQL injection, path traversal)
 * 5. Request size limits
 * 6. IP management
 * 7. Security logging
 */

// Security logger for security events
const logSecurityEvent = (
  level: 'info' | 'warn' | 'error', 
  message: string, 
  context: Record<string, any> = {}
) => {
  if (!config.security.logging.enableSecurityLogs) return;
  
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    type: 'SECURITY',
    message,
    ...context,
  };
  
  if (level === 'error') {
    console.error(`[SECURITY:${level.toUpperCase()}]`, JSON.stringify(logEntry));
  } else if (level === 'warn') {
    console.warn(`[SECURITY:${level.toUpperCase()}]`, JSON.stringify(logEntry));
  } else {
    console.log(`[SECURITY:${level.toUpperCase()}]`, JSON.stringify(logEntry));
  }
};

/**
 * HELMET SECURITY HEADERS
 * Configures comprehensive security headers
 */
export const securityHeaders = helmet({
  // Content Security Policy
  contentSecurityPolicy: config.security.csp.enabled ? {
    directives: {
      defaultSrc: config.security.csp.directives.defaultSrc,
      scriptSrc: config.security.csp.directives.scriptSrc,
      styleSrc: config.security.csp.directives.styleSrc,
      fontSrc: config.security.csp.directives.fontSrc,
      imgSrc: config.security.csp.directives.imgSrc,
      connectSrc: config.security.csp.directives.connectSrc,
      frameSrc: config.security.csp.directives.frameSrc,
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      ...(config.isProduction ? { upgradeInsecureRequests: [] } : {})
    },
    reportOnly: config.security.csp.reportOnly,
  } : false,

  // Strict Transport Security (HSTS)
  hsts: config.isProduction ? {
    maxAge: config.security.headers.hsts.maxAge,
    includeSubDomains: config.security.headers.hsts.includeSubDomains,
    preload: config.security.headers.hsts.preload,
  } : false,

  // Remove X-Powered-By header
  hidePoweredBy: config.security.headers.removeXPoweredBy,

  // X-Frame-Options
  frameguard: config.security.headers.frameguard,

  // X-Content-Type-Options
  noSniff: config.security.headers.noSniff,

  // X-XSS-Protection
  xssFilter: config.security.headers.xssProtection,

  // Referrer Policy
  referrerPolicy: { policy: config.security.headers.referrerPolicy },

  // Cross-Origin Embedder Policy
  crossOriginEmbedderPolicy: false, // Disabled for compatibility

  // Cross-Origin Opener Policy  
  crossOriginOpenerPolicy: { policy: 'same-origin' },

  // Cross-Origin Resource Policy
  crossOriginResourcePolicy: { policy: 'cross-origin' },

  // Origin Agent Cluster
  originAgentCluster: true,

  // DNS Prefetch Control
  dnsPrefetchControl: { allow: false },
});

/**
 * CORS CONFIGURATION
 * Configures Cross-Origin Resource Sharing
 */
export const corsConfiguration = cors({
  origin: config.security.cors.origin,
  methods: [...config.security.cors.methods],
  allowedHeaders: [...config.security.cors.allowedHeaders],
  exposedHeaders: [...config.security.cors.exposedHeaders],
  credentials: config.security.cors.credentials,
  maxAge: config.security.cors.maxAge,
  optionsSuccessStatus: 200, // Some legacy browsers choke on 204
  preflightContinue: false,
});

/**
 * INPUT SANITIZATION MIDDLEWARE
 * Sanitizes user inputs to prevent XSS and other attacks
 */
export const sanitizeInputs = (req: Request, res: Response, next: NextFunction): void => {
  if (!config.security.validation.enableHtmlSanitization) {
    return next();
  }

  try {
    // Recursive function to sanitize object properties
    const sanitizeValue = (value: any): any => {
      if (typeof value === 'string') {
        // Basic HTML sanitization
        return value
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
          .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove iframe tags
          .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '') // Remove object tags
          .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '') // Remove embed tags
          .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers
          .replace(/javascript:/gi, '') // Remove javascript: protocols
          .replace(/data:text\/html/gi, '') // Remove data URLs with HTML
          .replace(/expression\s*\(/gi, '') // Remove CSS expressions
          .replace(/vbscript:/gi, '') // Remove vbscript: protocols
          .trim();
      } else if (Array.isArray(value)) {
        return value.map(sanitizeValue);
      } else if (typeof value === 'object' && value !== null) {
        const sanitized: any = {};
        for (const [key, val] of Object.entries(value)) {
          sanitized[key] = sanitizeValue(val);
        }
        return sanitized;
      }
      return value;
    };

    // Sanitize body, query, and params
    if (req.body) {
      req.body = sanitizeValue(req.body);
    }
    if (req.query) {
      req.query = sanitizeValue(req.query);
    }
    if (req.params) {
      req.params = sanitizeValue(req.params);
    }

    next();
  } catch (error) {
    logSecurityEvent('error', 'Input sanitization failed', {
      ip: req.ip,
      endpoint: req.path,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    next();
  }
};

/**
 * SQL INJECTION PROTECTION
 * Detects and blocks potential SQL injection attempts
 */
export const sqlInjectionProtection = (req: Request, res: Response, next: NextFunction): void => {
  if (!config.security.validation.enableSqlInjectionProtection) {
    return next();
  }

  const sqlPatterns = [
    /(\s|^)(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\s/i,
    /(UNION|JOIN)\s+(ALL\s+)?SELECT/i,
    /'\s*(OR|AND)\s*'\w*'\s*=\s*'\w*'/i,
    /;\s*(DROP|DELETE|INSERT|UPDATE)/i,
    /-{2,}|\/{2,}/,
    /\/\*.*\*\//,
    /(xp_|sp_)[a-z_]+/i,
  ];

  const checkForSqlInjection = (value: any, path: string = ''): boolean => {
    if (typeof value === 'string' && value.length > 0) {
      return sqlPatterns.some(pattern => pattern.test(value));
    } else if (Array.isArray(value)) {
      return value.some((item, index) => checkForSqlInjection(item, `${path}[${index}]`));
    } else if (typeof value === 'object' && value !== null) {
      return Object.entries(value).some(([key, val]) => 
        checkForSqlInjection(val, path ? `${path}.${key}` : key)
      );
    }
    return false;
  };

  // Check body, query, and params
  const checkTargets = [
    { data: req.body, name: 'body' },
    { data: req.query, name: 'query' },
    { data: req.params, name: 'params' },
  ];

  for (const target of checkTargets) {
    if (target.data && checkForSqlInjection(target.data)) {
      logSecurityEvent('error', 'SQL injection attempt detected', {
        ip: req.ip,
        endpoint: req.path,
        method: req.method,
        userAgent: req.get('User-Agent'),
        target: target.name,
        suspiciousData: JSON.stringify(target.data),
      });

      const error = new AppError('Entrada inválida detectada', 400);
      res.status(400).json({
        error: error.message,
        code: 'INVALID_INPUT',
        timestamp: new Date().toISOString(),
      });
      return;
    }
  }

  next();
};

/**
 * PATH TRAVERSAL PROTECTION
 * Prevents directory traversal attacks
 */
export const pathTraversalProtection = (req: Request, res: Response, next: NextFunction): void => {
  if (!config.security.validation.enablePathTraversalProtection) {
    return next();
  }

  const dangerousPatterns = [
    /\.\.[\/\\]/,
    /[\/\\]\.\./,
    /%2e%2e/i,
    /%252e%252e/i,
    /\.\.\x2f/,
    /\.\.\x5c/,
    /\/etc\/passwd/i,
    /\/windows\/system32/i,
    /\\windows\\system32/i,
  ];

  const checkPath = req.path;
  const queryString = req.url?.split('?')[1] || '';
  
  // Check URL path and query string
  const suspiciousContent = [checkPath, queryString, JSON.stringify(req.body)].join(' ');
  
  if (dangerousPatterns.some(pattern => pattern.test(suspiciousContent))) {
    logSecurityEvent('error', 'Path traversal attempt detected', {
      ip: req.ip,
      endpoint: req.path,
      method: req.method,
      userAgent: req.get('User-Agent'),
      suspiciousPath: checkPath,
      queryString,
    });

    const error = new AppError('Caminho inválido', 400);
    res.status(400).json({
      error: error.message,
      code: 'INVALID_PATH',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  next();
};

/**
 * REQUEST SIZE LIMITING
 * Limits request body and upload sizes
 */
export const requestSizeLimit = (req: Request, res: Response, next: NextFunction): void => {
  const contentLength = parseInt(req.get('Content-Length') || '0', 10);
  const isUpload = req.path.includes('/upload') || req.path.includes('/objects');
  
  // Different limits for uploads vs regular requests
  const limit = isUpload 
    ? config.security.limits.fileUploadLimit 
    : parseInt(config.security.limits.jsonBodyLimit.replace('mb', '')) * 1024 * 1024;

  if (contentLength > limit) {
    logSecurityEvent('warn', 'Request size limit exceeded', {
      ip: req.ip,
      endpoint: req.path,
      method: req.method,
      contentLength,
      limit,
      isUpload,
    });

    const error = new AppError('Tamanho da requisição muito grande', 413);
    res.status(413).json({
      error: error.message,
      code: 'REQUEST_TOO_LARGE',
      limit: `${Math.round(limit / 1024 / 1024)}MB`,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  next();
};

/**
 * SUSPICIOUS ACTIVITY DETECTION
 * Detects and logs suspicious request patterns
 */
export const suspiciousActivityDetection = (req: Request, res: Response, next: NextFunction): void => {
  if (!config.security.logging.logSuspiciousActivity) {
    return next();
  }

  const userAgent = req.get('User-Agent') || '';
  const suspiciousPatterns = [
    // Common attack tools
    /nikto/i,
    /sqlmap/i,
    /nmap/i,
    /masscan/i,
    /curl.*bot/i,
    /python-requests/i,
    // Suspicious user agents
    /scanner/i,
    /crawler/i,
    /bot.*hack/i,
    // Empty or minimal user agents
    /^$/,
    /^\s*$/,
    /^[a-z]$/,
  ];

  // Check for suspicious user agent
  if (suspiciousPatterns.some(pattern => pattern.test(userAgent))) {
    logSecurityEvent('warn', 'Suspicious user agent detected', {
      ip: req.ip,
      endpoint: req.path,
      method: req.method,
      userAgent,
    });
  }

  // Check for suspicious request patterns
  const suspiciousEndpoints = [
    '/admin',
    '/wp-admin',
    '/.env',
    '/config',
    '/phpMyAdmin',
    '/backup',
    '/.git',
    '/shell',
    '/eval',
  ];

  if (suspiciousEndpoints.some(endpoint => req.path.includes(endpoint))) {
    logSecurityEvent('warn', 'Suspicious endpoint access attempt', {
      ip: req.ip,
      endpoint: req.path,
      method: req.method,
      userAgent,
    });
  }

  // Check for rapid sequential requests (basic pattern detection)
  const clientKey = `${req.ip}:${req.get('User-Agent')}`;
  const now = Date.now();
  
  if (!req.app.locals.requestTracker) {
    req.app.locals.requestTracker = new Map();
  }
  
  const tracker = req.app.locals.requestTracker;
  const lastRequest = tracker.get(clientKey);
  
  if (lastRequest && now - lastRequest < 100) { // Less than 100ms between requests
    logSecurityEvent('warn', 'Rapid sequential requests detected', {
      ip: req.ip,
      endpoint: req.path,
      method: req.method,
      userAgent,
      timeDiff: now - lastRequest,
    });
  }
  
  tracker.set(clientKey, now);
  
  // Clean up old entries (basic cleanup)
  if (tracker.size > 1000) {
    const oldestAllowed = now - 60000; // 1 minute
    for (const [key, timestamp] of tracker.entries()) {
      if (timestamp < oldestAllowed) {
        tracker.delete(key);
      }
    }
  }

  next();
};

/**
 * COMPREHENSIVE SECURITY VALIDATION
 * Express-validator based validation with security focus
 */
export const createSecureValidation = (fields: ValidationChain[]): ValidationChain[] => {
  return fields.map(field => {
    return field
      .trim() // Trim whitespace
      .escape() // Escape HTML entities
      .isLength({ max: config.security.validation.maxInputLength }) // Limit length
      .withMessage(`Campo muito longo (máximo ${config.security.validation.maxInputLength} caracteres)`);
  });
};

/**
 * SECURITY VALIDATION ERROR HANDLER
 * Handles express-validator errors with security logging
 */
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorDetails = errors.array();
    
    logSecurityEvent('warn', 'Validation errors detected', {
      ip: req.ip,
      endpoint: req.path,
      method: req.method,
      errors: errorDetails,
    });

    res.status(400).json({
      error: 'Dados de entrada inválidos',
      code: 'VALIDATION_ERROR',
      details: errorDetails,
      timestamp: new Date().toISOString(),
    });
    return;
  }
  
  next();
};

/**
 * REQUEST TIMEOUT MIDDLEWARE
 * Sets timeouts for requests to prevent DoS
 */
export const requestTimeout = (req: Request, res: Response, next: NextFunction): void => {
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      logSecurityEvent('warn', 'Request timeout', {
        ip: req.ip,
        endpoint: req.path,
        method: req.method,
        timeout: config.security.limits.requestTimeout,
      });

      const error = new AppError('Tempo limite da requisição excedido', 408);
      res.status(408).json({
        error: error.message,
        code: 'REQUEST_TIMEOUT',
        timestamp: new Date().toISOString(),
      });
    }
  }, config.security.limits.requestTimeout);

  // Clear timeout when response finishes
  res.on('finish', () => {
    clearTimeout(timeout);
  });

  next();
};

/**
 * SECURITY HEALTH CHECK
 * Endpoint to check security middleware status
 */
export const securityHealthCheck = (req: Request, res: Response): void => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    security: {
      headers: {
        csp: config.security.csp.enabled,
        hsts: config.isProduction,
        xss: config.security.headers.xssProtection,
        noSniff: config.security.headers.noSniff,
      },
      validation: {
        htmlSanitization: config.security.validation.enableHtmlSanitization,
        sqlInjectionProtection: config.security.validation.enableSqlInjectionProtection,
        xssProtection: config.security.validation.enableXssProtection,
        pathTraversalProtection: config.security.validation.enablePathTraversalProtection,
      },
      logging: {
        securityLogs: config.security.logging.enableSecurityLogs,
        rateLimitLogs: config.security.logging.logRateLimitHits,
        authLogs: config.security.logging.logFailedAuth,
        suspiciousActivity: config.security.logging.logSuspiciousActivity,
      },
      cors: {
        origin: Array.isArray(config.security.cors.origin) 
          ? config.security.cors.origin.length 
          : config.security.cors.origin === true ? 'all' : 'restricted',
        credentials: config.security.cors.credentials,
      },
    },
    environment: config.nodeEnv,
  };
  
  res.json(health);
};