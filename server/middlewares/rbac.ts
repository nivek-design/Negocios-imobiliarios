import { AuthorizationError, ErrorMessages } from '../core/errors';
import { asyncHandler } from '../core/asyncHandler';
import { AuthenticatedRequest, UserRoles } from '../core/types';
import { requireAuth } from './auth';

/**
 * ROLE-BASED ACCESS CONTROL (RBAC) MIDDLEWARE
 * Provides role-based authorization for different user types
 */

// Helper function to check user roles consistently
const checkUserRole = (user: any, allowedRoles: string[]): boolean => {
  const userRole = user?.role;
  return userRole && allowedRoles.includes(userRole);
};

/**
 * AGENT OR ADMIN ACCESS MIDDLEWARE
 * Requires user to be either an agent or admin
 */
export const requireAgent = asyncHandler(async (req: any, res: any, next) => {
  // First ensure user is authenticated
  await new Promise<void>((resolve, reject) => {
    requireAuth(req, res, (err?: any) => {
      if (err) reject(err);
      else resolve();
    });
  });

  const user = (req as AuthenticatedRequest).user;
  
  if (!checkUserRole(user, [UserRoles.AGENT, UserRoles.ADMIN])) {
    throw new AuthorizationError(ErrorMessages.AGENT_ADMIN_ONLY);
  }
  
  next();
});

/**
 * ADMIN-ONLY ACCESS MIDDLEWARE
 * Requires user to be an admin
 */
export const requireAdmin = asyncHandler(async (req: any, res: any, next) => {
  // First ensure user is authenticated
  await new Promise<void>((resolve, reject) => {
    requireAuth(req, res, (err?: any) => {
      if (err) reject(err);
      else resolve();
    });
  });

  const user = (req as AuthenticatedRequest).user;
  
  if (!checkUserRole(user, [UserRoles.ADMIN])) {
    throw new AuthorizationError(ErrorMessages.ADMIN_ONLY);
  }
  
  next();
});

/**
 * CLIENT ACCESS MIDDLEWARE
 * Requires user to be a client (for client-specific features)
 */
export const requireClient = asyncHandler(async (req: any, res: any, next) => {
  // First ensure user is authenticated
  await new Promise<void>((resolve, reject) => {
    requireAuth(req, res, (err?: any) => {
      if (err) reject(err);
      else resolve();
    });
  });

  const user = (req as AuthenticatedRequest).user;
  
  if (!checkUserRole(user, [UserRoles.CLIENT])) {
    throw new AuthorizationError('Acesso negado. Apenas clientes.');
  }
  
  next();
});

/**
 * CUSTOM ROLE CHECK MIDDLEWARE FACTORY
 * Creates middleware for custom role combinations
 */
export const requireRoles = (allowedRoles: string[]) => {
  return asyncHandler(async (req: any, res: any, next) => {
    // First ensure user is authenticated
    await new Promise<void>((resolve, reject) => {
      requireAuth(req, res, (err?: any) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const user = (req as AuthenticatedRequest).user;
    
    if (!checkUserRole(user, allowedRoles)) {
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
export const requireSelfOrAdmin = (getUserIdFromParams?: (req: any) => string) => {
  return asyncHandler(async (req: any, res: any, next) => {
    // First ensure user is authenticated
    await new Promise<void>((resolve, reject) => {
      requireAuth(req, res, (err?: any) => {
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