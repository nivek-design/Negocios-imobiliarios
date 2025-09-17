import { Request, Response, NextFunction } from 'express';

/**
 * Core Types for Premier Properties Backend
 * Defines common interfaces and types used throughout the application
 */

// Extended Request interface with user data
export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
  property?: any; // Set by ownership middleware
}

// Standardized user object across all auth methods
export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'client' | 'agent' | 'admin';
  claims: { sub: string }; // For backward compatibility
}

// Optional authenticated request (user may or may not be present)
export interface OptionalAuthRequest extends Request {
  user?: AuthenticatedUser;
}

// Express handler types
export type RequestHandler = (req: Request, res: Response, next: NextFunction) => void | Promise<void>;
export type AuthRequestHandler = (req: AuthenticatedRequest, res: Response, next: NextFunction) => void | Promise<void>;
export type OptionalAuthRequestHandler = (req: OptionalAuthRequest, res: Response, next: NextFunction) => void | Promise<void>;

// API Response wrappers
export interface ApiResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  statusCode: number;
  timestamp: string;
  path: string;
  field?: string;
  fields?: Record<string, string[]>;
  stack?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

// JWT Payload
export interface JWTPayload {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  iat?: number;
  exp?: number;
}

// Cookie options type
export interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  maxAge: number;
}

// Common filter types
export interface BaseFilters {
  limit?: number;
  offset?: number;
  sortBy?: string;
  search?: string;
}

// Service method return type
export type ServiceResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
  statusCode?: number;
};

// Async handler wrapper type
export type AsyncHandler<T extends RequestHandler> = T;

// Validation schema types
export interface ValidationSchema {
  body?: any;
  params?: any;
  query?: any;
}

// Database filter interfaces (extending the existing ones from storage.ts)
export interface PropertyFilters extends BaseFilters {
  search?: string;
  keyword?: string;
  propertyType?: string[] | string;
  status?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  latitude?: number;
  longitude?: number;
  radius?: number;
  hasGarage?: boolean;
  hasPool?: boolean;
  hasBalcony?: boolean;
  hasGarden?: boolean;
  hasAirConditioning?: boolean;
  hasFireplace?: boolean;
  hasPetsAllowed?: boolean;
}

// Common HTTP status codes
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// User roles enum
export const UserRoles = {
  CLIENT: 'client',
  AGENT: 'agent',
  ADMIN: 'admin',
} as const;