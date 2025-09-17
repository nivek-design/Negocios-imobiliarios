import jwt from 'jsonwebtoken';
import { config } from '../core/config';
import { AuthenticationError, ErrorMessages } from '../core/errors';
import { asyncHandler } from '../core/asyncHandler';
import { AuthenticatedUser, AuthenticatedRequest, OptionalAuthRequest, JWTPayload } from '../core/types';
import { storage } from '../storage';
import { getCurrentUser } from '../authService';
import { createRequestLogger, createModuleLogger } from '../core/logger';

/**
 * ENHANCED AUTHENTICATION MIDDLEWARE WITH SECURITY AUDIT LOGGING
 * 
 * Implements the simplified authentication architecture with comprehensive security monitoring:
 * 1. PRIMARY: JWT Tokens from cookies (most secure for web apps)
 * 2. SECONDARY: JWT Tokens from Authorization header (for API clients)
 * 3. FALLBACK: Supabase JWT validation using supabase.auth.getUser()
 * 4. FALLBACK: Session-based auth for compatibility
 * 5. MINIMAL REPLIT FALLBACK: Only when absolutely necessary
 * 
 * All authentication attempts, failures, and suspicious activities are logged for security audit.
 * User object is standardized across all auth methods.
 */

// Module logger for authentication security events
const authLogger = createModuleLogger('Authentication');

// Track authentication attempts for suspicious activity detection
const authAttempts = new Map<string, { count: number; lastAttempt: number; methods: string[] }>();

// Helper function to track authentication attempts by IP
const trackAuthAttempt = (ip: string, method: string, success: boolean): void => {
  const current = authAttempts.get(ip) || { count: 0, lastAttempt: 0, methods: [] };
  
  current.count++;
  current.lastAttempt = Date.now();
  
  if (!current.methods.includes(method)) {
    current.methods.push(method);
  }
  
  authAttempts.set(ip, current);
  
  // Detect suspicious patterns
  const timeSinceFirst = Date.now() - (current.lastAttempt - (current.count - 1) * 1000);
  const isRapidAttempts = current.count > 5 && timeSinceFirst < 60000; // 5+ attempts in 1 minute
  const isMultipleMethods = current.methods.length > 2; // Using multiple auth methods
  
  if (!success && (isRapidAttempts || isMultipleMethods)) {
    authLogger.logSecurityEvent({
      type: 'SUSPICIOUS_ACTIVITY',
      severity: isRapidAttempts ? 'HIGH' : 'MEDIUM',
      ip,
      details: {
        reason: isRapidAttempts ? 'rapid_auth_attempts' : 'multiple_auth_methods',
        attemptCount: current.count,
        methods: current.methods,
        timeWindow: timeSinceFirst,
      },
    });
  }
  
  // Clean up old entries (older than 1 hour)
  const oneHourAgo = Date.now() - 3600000;
  for (const [key, value] of authAttempts.entries()) {
    if (value.lastAttempt < oneHourAgo) {
      authAttempts.delete(key);
    }
  }
};

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
 * ENHANCED REQUIRED AUTHENTICATION MIDDLEWARE
 * Requires user to be authenticated with comprehensive security audit logging
 */
export const requireAuth = asyncHandler(async (req: any, res: any, next) => {
  const logger = req.logger || createRequestLogger(req);
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'];
  let user: AuthenticatedUser | null = null;
  let authMethod: string = '';
  let authSuccess = false;
  const authDetails: any = {
    path: req.path,
    method: req.method,
    ip,
    userAgent,
    timestamp: new Date().toISOString(),
  };

  try {
    // 1. PRIMARY: Check cookie authToken first (most secure for web apps)
    const cookieToken = req.cookies?.authToken;
    if (cookieToken) {
      authMethod = 'cookie';
      try {
        const decoded = jwt.verify(cookieToken, config.jwt.secret) as JWTPayload;
        user = standardizeUser(decoded);
        authSuccess = true;
        
        logger.debug('Cookie authentication successful', {
          userId: user.id,
          userRole: user.role,
          authMethod,
        });
        
      } catch (error) {
        // Log JWT validation failure
        logger.warn('Cookie token validation failed', {
          authMethod,
          error: error.message,
          tokenPresent: !!cookieToken,
        });
        
        authLogger.logSecurityEvent({
          type: 'AUTH_FAILURE',
          severity: 'MEDIUM',
          ip,
          userAgent,
          details: {
            method: authMethod,
            reason: 'invalid_token',
            error: error.message,
            ...authDetails,
          },
        });
        
        // Only clear cookie if it was actually invalid
        res.clearCookie('authToken');
      }
    }

    // 2. SECONDARY: Check Authorization header (for API clients)
    if (!user) {
      const authHeaderToken = req.headers.authorization?.replace('Bearer ', '');
      if (authHeaderToken) {
        authMethod = 'header';
        try {
          const decoded = jwt.verify(authHeaderToken, config.jwt.secret) as JWTPayload;
          user = standardizeUser(decoded);
          authSuccess = true;
          
          logger.debug('Authorization header authentication successful', {
            userId: user.id,
            userRole: user.role,
            authMethod,
          });
          
        } catch (error) {
          logger.warn('Authorization header token validation failed', {
            authMethod,
            error: error.message,
            tokenPresent: !!authHeaderToken,
          });
          
          authLogger.logSecurityEvent({
            type: 'AUTH_FAILURE',
            severity: 'MEDIUM',
            ip,
            userAgent,
            details: {
              method: authMethod,
              reason: 'invalid_header_token',
              error: error.message,
              ...authDetails,
            },
          });
        }
      }
    }

    // 3. FALLBACK: Supabase JWT validation using supabase.auth.getUser()
    if (!user) {
      const token = cookieToken || req.headers.authorization?.replace('Bearer ', '');
      if (token) {
        authMethod = 'supabase';
        try {
          const supabaseUser = await getCurrentUser(token);
          if (supabaseUser) {
            user = standardizeUser(supabaseUser);
            authSuccess = true;
            
            logger.debug('Supabase authentication successful', {
              userId: user.id,
              userRole: user.role,
              authMethod,
            });
          }
        } catch (error) {
          logger.warn('Supabase authentication failed', {
            authMethod,
            error: error.message,
            tokenPresent: !!token,
          });
          
          authLogger.logSecurityEvent({
            type: 'AUTH_FAILURE',
            severity: 'LOW',
            ip,
            userAgent,
            details: {
              method: authMethod,
              reason: 'supabase_validation_failed',
              error: error.message,
              ...authDetails,
            },
          });
        }
      }
    }
    
    // 4. FALLBACK: Check session-based auth for compatibility
    if (!user && req.session?.user) {
      authMethod = 'session';
      user = standardizeUser(req.session.user);
      authSuccess = true;
      
      logger.debug('Session authentication successful', {
        userId: user.id,
        userRole: user.role,
        authMethod,
      });
    }
    
    // 5. MINIMAL REPLIT FALLBACK: Only if absolutely necessary
    if (!user && req.isAuthenticated && req.isAuthenticated() && req.user?.claims?.sub) {
      authMethod = 'replit';
      user = standardizeUser(req.user);
      authSuccess = true;
      
      logger.debug('Replit authentication successful', {
        userId: user.id,
        userRole: user.role,
        authMethod,
      });
      
      // Log replit fallback usage for monitoring
      authLogger.logSecurityEvent({
        type: 'AUTH_ATTEMPT',
        severity: 'LOW',
        userId: user.id,
        ip,
        userAgent,
        details: {
          method: authMethod,
          reason: 'replit_fallback_used',
          message: 'Using Replit authentication fallback',
          ...authDetails,
        },
      });
    }
    
    // Track authentication attempt
    trackAuthAttempt(ip, authMethod, authSuccess);
    
    // Log successful authentication
    if (user) {
      logger.info('Authentication successful', {
        userId: user.id,
        userRole: user.role,
        authMethod,
        email: user.email,
      });
      
      authLogger.logSecurityEvent({
        type: 'AUTH_ATTEMPT',
        severity: 'LOW',
        userId: user.id,
        ip,
        userAgent,
        details: {
          method: authMethod,
          success: true,
          userRole: user.role,
          email: user.email,
          ...authDetails,
        },
      });
      
      // Attach user to request
      (req as AuthenticatedRequest).user = user;
      return next();
    }
    
    // No valid authentication found - log and throw error
    logger.warn('Authentication failed - no valid credentials found', authDetails);
    
    authLogger.logSecurityEvent({
      type: 'AUTH_FAILURE',
      severity: 'MEDIUM',
      ip,
      userAgent,
      details: {
        reason: 'no_valid_credentials',
        methodsAttempted: authMethod || 'none',
        ...authDetails,
      },
    });
    
    trackAuthAttempt(ip, authMethod || 'none', false);
    throw new AuthenticationError(ErrorMessages.INVALID_CREDENTIALS);
    
  } catch (error) {
    // Log any unexpected errors in authentication
    if (!(error instanceof AuthenticationError)) {
      logger.error('Unexpected error during authentication', error, authDetails);
      
      authLogger.logSecurityEvent({
        type: 'AUTH_FAILURE',
        severity: 'HIGH',
        ip,
        userAgent,
        details: {
          reason: 'unexpected_error',
          error: error.message,
          authMethod,
          ...authDetails,
        },
      });
      
      trackAuthAttempt(ip, authMethod, false);
    }
    
    throw error;
  }
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