import { Request, Response, NextFunction } from 'express';
import { AuthorizationError, ErrorMessages } from '../core/errors';
import { asyncHandler } from '../core/asyncHandler';
import { AuthenticatedRequest, UserRoles } from '../core/types';
import { requireAuth } from './auth';
import { createRequestLogger, createModuleLogger } from '../core/logger';

/**
 * ENHANCED ROLE-BASED ACCESS CONTROL (RBAC) MIDDLEWARE
 * Provides role-based authorization with comprehensive security audit logging
 */

// Module logger for authorization security events
const rbacLogger = createModuleLogger('Authorization');

// Track authorization attempts for suspicious activity detection
const authorizationAttempts = new Map<string, { count: number; failures: number; lastAttempt: number }>();

// Helper function to check user roles consistently
const checkUserRole = (user: AuthenticatedRequest['user'], allowedRoles: string[]): boolean => {
  const userRole = user?.role;
  return userRole && allowedRoles.includes(userRole);
};

// Helper function to log authorization events
const logAuthorizationEvent = (
  req: Request, 
  user: AuthenticatedRequest['user'], 
  requiredRoles: string[], 
  success: boolean, 
  context: string
): void => {
  const logger = req.logger || createRequestLogger(req);
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'];
  
  // Track authorization attempts by user and IP
  const key = `${user?.id || 'unknown'}_${ip}`;
  const current = authorizationAttempts.get(key) || { count: 0, failures: 0, lastAttempt: 0 };
  
  current.count++;
  current.lastAttempt = Date.now();
  
  if (!success) {
    current.failures++;
  }
  
  authorizationAttempts.set(key, current);
  
  // Log the authorization event
  const logLevel = success ? 'info' : 'warn';
  const eventDetails = {
    userId: user?.id,
    userRole: user?.role,
    requiredRoles,
    success,
    context,
    path: req.path,
    method: req.method,
    ip,
    userAgent,
    timestamp: new Date().toISOString(),
  };
  
  logger[logLevel](`Authorization ${success ? 'granted' : 'denied'}: ${context}`, eventDetails);
  
  // Log security event for audit trail
  rbacLogger.logSecurityEvent({
    type: success ? 'DATA_ACCESS' : 'AUTHORIZATION_FAILURE',
    severity: success ? 'LOW' : 'MEDIUM',
    userId: user?.id,
    ip,
    userAgent,
    details: {
      context,
      requiredRoles,
      userRole: user?.role,
      success,
      ...eventDetails,
    },
  });
  
  // Detect suspicious authorization patterns
  if (!success && current.failures >= 3) {
    rbacLogger.logSecurityEvent({
      type: 'SUSPICIOUS_ACTIVITY',
      severity: 'HIGH',
      userId: user?.id,
      ip,
      userAgent,
      details: {
        reason: 'repeated_authorization_failures',
        failureCount: current.failures,
        totalAttempts: current.count,
        context,
        timeWindow: Date.now() - current.lastAttempt,
      },
    });
  }
  
  // Clean up old entries (older than 1 hour)
  const oneHourAgo = Date.now() - 3600000;
  for (const [key, value] of authorizationAttempts.entries()) {
    if (value.lastAttempt < oneHourAgo) {
      authorizationAttempts.delete(key);
    }
  }
};

/**
 * AGENT OR ADMIN ACCESS MIDDLEWARE
 * Requires user to be either an agent or admin
 */
export const requireAgent = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  // First ensure user is authenticated
  await new Promise<void>((resolve, reject) => {
    requireAuth(req, res, (err?: Error) => {
      if (err) reject(err);
      else resolve();
    });
  });

  const user = (req as AuthenticatedRequest).user;
  const requiredRoles = [UserRoles.AGENT, UserRoles.ADMIN];
  const hasAccess = checkUserRole(user, requiredRoles);
  
  // Log authorization event
  logAuthorizationEvent(req, user, requiredRoles, hasAccess, 'requireAgent');
  
  if (!hasAccess) {
    throw new AuthorizationError(ErrorMessages.AGENT_ADMIN_ONLY);
  }
  
  next();
});

/**
 * ADMIN-ONLY ACCESS MIDDLEWARE
 * Requires user to be an admin
 */
export const requireAdmin = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  // First ensure user is authenticated
  await new Promise<void>((resolve, reject) => {
    requireAuth(req, res, (err?: Error) => {
      if (err) reject(err);
      else resolve();
    });
  });

  const user = (req as AuthenticatedRequest).user;
  const requiredRoles = [UserRoles.ADMIN];
  const hasAccess = checkUserRole(user, requiredRoles);
  
  // Log authorization event
  logAuthorizationEvent(req, user, requiredRoles, hasAccess, 'requireAdmin');
  
  if (!hasAccess) {
    throw new AuthorizationError(ErrorMessages.ADMIN_ONLY);
  }
  
  next();
});

/**
 * SUPER ADMIN-ONLY ACCESS MIDDLEWARE
 * Requires user to be a super admin
 */
export const requireSuperAdmin = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  // First ensure user is authenticated
  await new Promise<void>((resolve, reject) => {
    requireAuth(req, res, (err?: Error) => {
      if (err) reject(err);
      else resolve();
    });
  });

  const user = (req as AuthenticatedRequest).user;
  const requiredRoles = [UserRoles.SUPER_ADMIN];
  const hasAccess = checkUserRole(user, requiredRoles);
  
  // Log authorization event
  logAuthorizationEvent(req, user, requiredRoles, hasAccess, 'requireSuperAdmin');
  
  if (!hasAccess) {
    throw new AuthorizationError('Acesso negado. Apenas super administradores.');
  }
  
  next();
});

/**
 * CLIENT ACCESS MIDDLEWARE
 * Requires user to be a client (for client-specific features)
 */
export const requireClient = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  // First ensure user is authenticated
  await new Promise<void>((resolve, reject) => {
    requireAuth(req, res, (err?: Error) => {
      if (err) reject(err);
      else resolve();
    });
  });

  const user = (req as AuthenticatedRequest).user;
  const requiredRoles = [UserRoles.CLIENT];
  const hasAccess = checkUserRole(user, requiredRoles);
  
  // Log authorization event
  logAuthorizationEvent(req, user, requiredRoles, hasAccess, 'requireClient');
  
  if (!hasAccess) {
    throw new AuthorizationError('Acesso negado. Apenas clientes.');
  }
  
  next();
});

/**
 * CUSTOM ROLE CHECK MIDDLEWARE FACTORY
 * Creates middleware for custom role combinations
 */
export const requireRoles = (allowedRoles: string[]) => {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    // First ensure user is authenticated
    await new Promise<void>((resolve, reject) => {
      requireAuth(req, res, (err?: Error) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const user = (req as AuthenticatedRequest).user;
    const hasAccess = checkUserRole(user, allowedRoles);
    
    // Log authorization event
    logAuthorizationEvent(req, user, allowedRoles, hasAccess, 'requireRoles');
    
    if (!hasAccess) {
      const roleList = allowedRoles.join(', ');
      throw new AuthorizationError(`Acesso negado. Roles permitidas: ${roleList}`);
    }
    
    next();
  });
};

/**
 * SELF OR ADMIN ACCESS MIDDLEWARE FACTORY
 * Allows user to access their own resources or admin to access any
 */
export const requireSelfOrAdmin = (getUserIdFromParams?: (req: Request) => string) => {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    // First ensure user is authenticated
    await new Promise<void>((resolve, reject) => {
      requireAuth(req, res, (err?: Error) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const user = (req as AuthenticatedRequest).user;
    
    // Admin can access anything
    if (checkUserRole(user, [UserRoles.ADMIN])) {
      return next();
    }
    
    // Get the target user ID from params or custom extractor
    const targetUserId = getUserIdFromParams 
      ? getUserIdFromParams(req)
      : req.params.userId || req.params.id;
    
    // User can only access their own resources
    if (user.id !== targetUserId) {
      throw new AuthorizationError('Acesso negado. Você só pode acessar seus próprios recursos.');
    }
    
    next();
  });
};