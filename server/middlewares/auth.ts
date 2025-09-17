import jwt from 'jsonwebtoken';
import { config } from '../core/config';
import { AuthenticationError, ErrorMessages } from '../core/errors';
import { asyncHandler } from '../core/asyncHandler';
import { AuthenticatedUser, AuthenticatedRequest, OptionalAuthRequest, JWTPayload } from '../core/types';
import { storage } from '../storage';
import { getCurrentUser } from '../authService';

/**
 * AUTHENTICATION MIDDLEWARE - PRODUCTION READY
 * 
 * Implements the simplified authentication architecture with the following priorities:
 * 1. PRIMARY: JWT Tokens from cookies (most secure for web apps)
 * 2. SECONDARY: JWT Tokens from Authorization header (for API clients)
 * 3. FALLBACK: Supabase JWT validation using supabase.auth.getUser()
 * 4. FALLBACK: Session-based auth for compatibility
 * 5. MINIMAL REPLIT FALLBACK: Only when absolutely necessary
 * 
 * User object is standardized across all auth methods.
 */

// Helper functions for user data extraction and standardization
const getUserId = (user: any): string => {
  return user?.id || user?.claims?.sub || user?.sub;
};

const getUserRole = (user: any): string => {
  return user?.role || user?.userRole || 'client';
};

const standardizeUser = (userData: any): AuthenticatedUser => {
  const userId = getUserId(userData);
  const userRole = getUserRole(userData);
  
  return {
    id: userId,
    email: userData.email,
    firstName: userData.firstName || '',
    lastName: userData.lastName || '',
    role: userRole as 'client' | 'agent' | 'admin',
    claims: { sub: userId }, // For backward compatibility
  };
};

/**
 * REQUIRED AUTHENTICATION MIDDLEWARE
 * Requires user to be authenticated, throws error if not
 */
export const requireAuth = asyncHandler(async (req: any, res: any, next) => {
  let user: AuthenticatedUser | null = null;

  // 1. PRIMARY: Check cookie authToken first (most secure for web apps)
  const cookieToken = req.cookies?.authToken;
  if (cookieToken) {
    try {
      const decoded = jwt.verify(cookieToken, config.jwt.secret) as JWTPayload;
      user = standardizeUser(decoded);
    } catch (error) {
      // Only clear cookie if it was actually invalid
      res.clearCookie('authToken');
    }
  }

  // 2. SECONDARY: Check Authorization header (for API clients)
  if (!user) {
    const authHeaderToken = req.headers.authorization?.replace('Bearer ', '');
    if (authHeaderToken) {
      try {
        const decoded = jwt.verify(authHeaderToken, config.jwt.secret) as JWTPayload;
        user = standardizeUser(decoded);
      } catch (error) {
        // DO NOT clear cookie here - authorization header failure shouldn't affect cookie auth
        // Continue to fallback methods
      }
    }
  }

  // 3. FALLBACK: Supabase JWT validation using supabase.auth.getUser()
  if (!user) {
    const token = cookieToken || req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      try {
        const supabaseUser = await getCurrentUser(token);
        if (supabaseUser) {
          user = standardizeUser(supabaseUser);
        }
      } catch (error) {
        // Supabase validation failed, continue to session auth
      }
    }
  }
  
  // 4. FALLBACK: Check session-based auth for compatibility
  if (!user && req.session?.user) {
    user = standardizeUser(req.session.user);
  }
  
  // 5. MINIMAL REPLIT FALLBACK: Only if absolutely necessary
  if (!user && req.isAuthenticated && req.isAuthenticated() && req.user?.claims?.sub) {
    user = standardizeUser(req.user);
  }
  
  // Throw error if no valid authentication found
  if (!user) {
    throw new AuthenticationError(ErrorMessages.INVALID_CREDENTIALS);
  }
  
  // Attach user to request
  (req as AuthenticatedRequest).user = user;
  next();
});

/**
 * OPTIONAL AUTHENTICATION MIDDLEWARE
 * Sets user if authenticated, but doesn't require authentication
 */
export const optionalAuth = asyncHandler(async (req: any, res: any, next) => {
  try {
    await requireAuth(req, res, () => {
      // User is authenticated
      next();
    });
  } catch (error) {
    // User is not authenticated, but that's okay for optional auth
    // Clear any invalid cookies but don't throw error
    if (req.cookies?.authToken) {
      try {
        jwt.verify(req.cookies.authToken, config.jwt.secret);
      } catch {
        res.clearCookie('authToken');
      }
    }
    
    // Continue without user
    (req as OptionalAuthRequest).user = undefined;
    next();
  }
});

/**
 * JWT TOKEN GENERATOR
 * Creates secure tokens containing user data for stateless authentication
 */
export const generateToken = (user: any, rememberMe: boolean = false): string => {
  const expiresIn = rememberMe ? config.jwt.rememberMeExpiresIn : config.jwt.expiresIn;
  
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName 
    },
    config.jwt.secret,
    { expiresIn }
  );
};