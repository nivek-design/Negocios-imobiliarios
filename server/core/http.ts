/**
 * HTTP Utilities and Constants
 * Common HTTP-related utilities for the application
 */

import { Response } from 'express';
import { config } from './config';
import { CookieOptions } from './types';

// HTTP Status Codes
export const HTTP_STATUS = {
  // Success
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,

  // Client Error
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,

  // Server Error
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Standard cookie configuration
export const getCookieOptions = (rememberMe: boolean = false): CookieOptions => ({
  httpOnly: config.security.cookieHttpOnly,
  secure: config.security.cookieSecure,
  sameSite: config.security.cookieSameSite,
  maxAge: rememberMe 
    ? 30 * 24 * 60 * 60 * 1000 // 30 days
    : 24 * 60 * 60 * 1000,      // 24 hours
});

// Helper to clear authentication cookies
export const clearAuthCookies = (res: Response): void => {
  // Clear JWT token cookie
  res.clearCookie('authToken', {
    httpOnly: true,
    secure: config.security.cookieSecure,
    sameSite: config.security.cookieSameSite,
    path: '/'
  });

  // Clear session cookie
  res.clearCookie('connect.sid', {
    path: '/',
    httpOnly: true,
    secure: config.security.cookieSecure
  });
};

// Helper to set authentication cookies
export const setAuthCookie = (res: Response, token: string, rememberMe: boolean = false): void => {
  const cookieOptions = getCookieOptions(rememberMe);
  res.cookie('authToken', token, cookieOptions);
};

// CORS headers (if needed)
export const setCorsHeaders = (res: Response): void => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
};

// Common response headers
export const setSecurityHeaders = (res: Response): void => {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  
  if (config.isProduction) {
    res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
};

// Response utilities
export const createSuccessResponse = <T>(data: T, message?: string) => ({
  success: true as const,
  data,
  message,
  timestamp: new Date().toISOString(),
});

export const createPaginatedResponse = <T>(
  data: T[], 
  total: number, 
  page: number, 
  limit: number,
  message?: string
) => ({
  success: true as const,
  data,
  message,
  pagination: {
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  },
  timestamp: new Date().toISOString(),
});