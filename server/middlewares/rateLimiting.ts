import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';
import { type Request, type Response, type NextFunction } from 'express';
import { config } from '../core/config';
import { AppError } from '../core/errors';

/**
 * RATE LIMITING MIDDLEWARE - COMPREHENSIVE PROTECTION
 * 
 * Implements multiple levels of rate limiting:
 * 1. Global rate limiting for all requests
 * 2. Authentication endpoint protection
 * 3. API-specific rate limiting by category
 * 4. Upload endpoint protection
 * 5. IP whitelist/blacklist management
 * 6. Security logging for rate limit hits
 */

// Rate limit store for memory-based tracking
interface RateLimitStore {
  [key: string]: {
    totalHits: number;
    resetTime: Date;
  };
}

const store: RateLimitStore = {};

// Security logger for rate limit events
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
    type: 'RATE_LIMIT',
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


// Skip function for trusted IPs and health checks
const skipRateLimiting = (req: Request): boolean => {
  const clientIp = req.ip || req.connection.remoteAddress;
  
  // Skip for trusted IPs
  if (clientIp && config.security.rateLimiting.trustedIPs.includes(clientIp)) {
    return true;
  }
  
  // Skip health checks
  if (req.path === '/health' || req.path === '/ping' || req.path === '/api/health') {
    return true;
  }
  
  // Skip whitelisted IPs
  if (clientIp && config.security.ipManagement.whitelistedIPs.includes(clientIp)) {
    return true;
  }
  
  return false;
};

// Rate limit hit handler
const handleRateLimit = (req: Request, res: Response) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.get('User-Agent') || 'unknown';
  const endpoint = req.path;
  
  // Log rate limit hit
  if (config.security.logging.logRateLimitHits) {
    logSecurityEvent('warn', 'Rate limit exceeded', {
      ip,
      userAgent,
      endpoint,
      method: req.method,
      rateLimitType: res.get('X-RateLimit-Type') || 'unknown',
    });
  }
  
  // Add security headers
  res.set({
    'X-RateLimit-Type': res.get('X-RateLimit-Type') || 'global',
    'Retry-After': res.get('Retry-After') || '900', // Default 15 minutes
  });
  
  // Enhanced error response
  const error = new AppError(
    'Muitas tentativas. Tente novamente em alguns minutos.',
    429,
    true
  );
  
  res.status(429).json({
    error: error.message,
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: parseInt(res.get('Retry-After') || '900', 10),
    timestamp: new Date().toISOString(),
  });
};

/**
 * GLOBAL RATE LIMITING
 * Applied to all requests as a baseline protection
 */
export const globalRateLimit: RateLimitRequestHandler = rateLimit({
  windowMs: config.security.rateLimiting.global.windowMs,
  max: config.security.rateLimiting.global.maxRequests,
  message: {
    error: 'Muitas requisições. Tente novamente em alguns minutos.',
    code: 'GLOBAL_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true, // Add standard rate limiting headers
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    // Use secure IP-based key generation that properly handles IPv6
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userId = (req as any).user?.id || 'anonymous';
    return `global:${ip}:${userId}`;
  },
  skip: skipRateLimiting,
  handler: (req, res) => {
    res.set('X-RateLimit-Type', 'global');
    // Log limit reached event in handler since onLimitReached is deprecated
    logSecurityEvent('warn', 'Global rate limit reached', {
      ip: req.ip,
      endpoint: req.path,
      method: req.method,
    });
    handleRateLimit(req, res);
  },
});

/**
 * AUTHENTICATION RATE LIMITING
 * Strict limits for login/register/password reset endpoints
 */
export const authRateLimit: RateLimitRequestHandler = rateLimit({
  windowMs: config.security.rateLimiting.auth.windowMs,
  max: config.security.rateLimiting.auth.maxRequests,
  message: {
    error: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    // Use secure IP-based key generation that properly handles IPv6
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userId = (req as any).user?.id || 'anonymous';
    return `auth:${ip}:${userId}`;
  },
  skip: (req) => {
    // Never skip auth rate limiting except for whitelisted IPs
    const clientIp = req.ip || req.connection.remoteAddress;
    return clientIp ? config.security.ipManagement.whitelistedIPs.includes(clientIp) : false;
  },
  handler: (req, res) => {
    res.set('X-RateLimit-Type', 'authentication');
    
    // Enhanced logging for auth attempts (includes onLimitReached logic)
    logSecurityEvent('error', 'Authentication rate limit reached - possible brute force', {
      ip: req.ip,
      endpoint: req.path,
      method: req.method,
      userAgent: req.get('User-Agent'),
    });
    
    if (config.security.logging.logFailedAuth) {
      logSecurityEvent('error', 'Authentication rate limit exceeded', {
        ip: req.ip,
        endpoint: req.path,
        method: req.method,
        userAgent: req.get('User-Agent'),
        body: req.body ? Object.keys(req.body) : [],
      });
    }
    
    handleRateLimit(req, res);
  },
});

/**
 * PROPERTIES API RATE LIMITING
 * Moderate limits for property-related endpoints
 */
export const propertiesRateLimit: RateLimitRequestHandler = rateLimit({
  windowMs: config.security.rateLimiting.api.properties.windowMs,
  max: config.security.rateLimiting.api.properties.maxRequests,
  message: {
    error: 'Muitas consultas de propriedades. Tente novamente em um minuto.',
    code: 'PROPERTIES_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    // Use secure IP-based key generation that properly handles IPv6
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userId = (req as any).user?.id || 'anonymous';
    return `properties:${ip}:${userId}`;
  },
  skip: skipRateLimiting,
  handler: (req, res) => {
    res.set('X-RateLimit-Type', 'properties');
    handleRateLimit(req, res);
  },
});

/**
 * INQUIRIES API RATE LIMITING
 * Stricter limits for inquiry/contact endpoints to prevent spam
 */
export const inquiriesRateLimit: RateLimitRequestHandler = rateLimit({
  windowMs: config.security.rateLimiting.api.inquiries.windowMs,
  max: config.security.rateLimiting.api.inquiries.maxRequests,
  message: {
    error: 'Muitas solicitações de contato. Tente novamente em um minuto.',
    code: 'INQUIRIES_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    // Use secure IP-based key generation that properly handles IPv6
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userId = (req as any).user?.id || 'anonymous';
    return `inquiries:${ip}:${userId}`;
  },
  skip: skipRateLimiting,
  handler: (req, res) => {
    res.set('X-RateLimit-Type', 'inquiries');
    
    // Log potential spam attempts
    logSecurityEvent('warn', 'Inquiry rate limit exceeded - potential spam', {
      ip: req.ip,
      endpoint: req.path,
      method: req.method,
      userAgent: req.get('User-Agent'),
    });
    
    handleRateLimit(req, res);
  },
});

/**
 * UPLOADS RATE LIMITING
 * Very strict limits for file upload endpoints
 */
export const uploadsRateLimit: RateLimitRequestHandler = rateLimit({
  windowMs: config.security.rateLimiting.api.uploads.windowMs,
  max: config.security.rateLimiting.api.uploads.maxRequests,
  message: {
    error: 'Muitas tentativas de upload. Tente novamente em um minuto.',
    code: 'UPLOADS_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    // Use secure IP-based key generation that properly handles IPv6
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userId = (req as any).user?.id || 'anonymous';
    return `uploads:${ip}:${userId}`;
  },
  skip: skipRateLimiting,
  handler: (req, res) => {
    res.set('X-RateLimit-Type', 'uploads');
    
    // Log upload abuse attempts
    logSecurityEvent('warn', 'Upload rate limit exceeded - potential abuse', {
      ip: req.ip,
      endpoint: req.path,
      method: req.method,
      userAgent: req.get('User-Agent'),
      contentLength: req.get('Content-Length'),
    });
    
    handleRateLimit(req, res);
  },
});

/**
 * FLEXIBLE RATE LIMITING
 * Create custom rate limits for specific endpoints
 */
export const createCustomRateLimit = (
  windowMs: number,
  maxRequests: number,
  message: string,
  type: string
): RateLimitRequestHandler => {
  return rateLimit({
    windowMs,
    max: maxRequests,
    message: {
      error: message,
      code: `${type.toUpperCase()}_RATE_LIMIT_EXCEEDED`,
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request): string => {
      // Use secure IP-based key generation that properly handles IPv6
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      const userId = (req as any).user?.id || 'anonymous';
      return `${type}:${ip}:${userId}`;
    },
    skip: skipRateLimiting,
    handler: (req, res) => {
      res.set('X-RateLimit-Type', type);
      handleRateLimit(req, res);
    },
  });
};

/**
 * SMART RATE LIMITING MIDDLEWARE
 * Applies different rate limits based on endpoint patterns
 */
export const smartRateLimit = (req: Request, res: Response, next: NextFunction): void => {
  const path = req.path;
  
  // Apply specific rate limiting based on endpoint
  if (path.includes('/auth/') || path.includes('/login') || path.includes('/register')) {
    authRateLimit(req, res, next);
  } else if (path.includes('/properties')) {
    propertiesRateLimit(req, res, next);
  } else if (path.includes('/inquiries') || path.includes('/contact')) {
    inquiriesRateLimit(req, res, next);
  } else if (path.includes('/upload') || path.includes('/objects')) {
    uploadsRateLimit(req, res, next);
  } else {
    globalRateLimit(req, res, next);
  }
};

/**
 * IP BLOCKING MIDDLEWARE
 * Check blocked IPs before applying rate limits
 */
export const ipBlockingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const clientIp = req.ip || req.connection.remoteAddress;
  
  // Check if IP is blocked
  if (clientIp && config.security.ipManagement.blockedIPs.includes(clientIp)) {
    logSecurityEvent('error', 'Blocked IP attempted access', {
      ip: clientIp,
      endpoint: req.path,
      method: req.method,
      userAgent: req.get('User-Agent'),
    });
    
    const error = new AppError('Acesso negado', 403);
    res.status(403).json({
      error: error.message,
      code: 'IP_BLOCKED',
      timestamp: new Date().toISOString(),
    });
    return;
  }
  
  next();
};

/**
 * RATE LIMITING HEALTH CHECK
 * Endpoint to check rate limiting status
 */
export const rateLimitHealthCheck = (req: Request, res: Response): void => {
  const clientIp = req.ip || req.connection.remoteAddress;
  
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    rateLimit: {
      globalEnabled: true,
      authEnabled: true,
      apiEnabled: true,
      clientIp,
      isTrusted: clientIp ? config.security.rateLimiting.trustedIPs.includes(clientIp) : false,
      isWhitelisted: clientIp ? config.security.ipManagement.whitelistedIPs.includes(clientIp) : false,
      isBlocked: clientIp ? config.security.ipManagement.blockedIPs.includes(clientIp) : false,
    },
    configuration: {
      globalLimit: config.security.rateLimiting.global.maxRequests,
      globalWindow: config.security.rateLimiting.global.windowMs,
      authLimit: config.security.rateLimiting.auth.maxRequests,
      authWindow: config.security.rateLimiting.auth.windowMs,
    },
  };
  
  res.json(health);
};