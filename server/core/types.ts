import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodType } from 'zod';
import { Property } from '@shared/schema';

/**
 * Core Types for Premier Properties Backend
 * Defines common interfaces and types used throughout the application
 */

// Branded types for better type safety
export type PropertyId = string & { readonly __brand: unique symbol };
export type UserId = string & { readonly __brand: unique symbol };
export type InquiryId = string & { readonly __brand: unique symbol };
export type AppointmentId = string & { readonly __brand: unique symbol };

// Extended Request interface with user data
export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
  property?: Property; // Set by ownership middleware - now properly typed
  startTime?: number; // For performance monitoring
}

// Standardized user object across all auth methods
export interface AuthenticatedUser {
  id: UserId;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  claims: { sub: string }; // For backward compatibility
  sessionId?: string;
  lastLoginAt?: Date;
  permissions?: string[];
}

// Optional authenticated request (user may or may not be present)
export interface OptionalAuthRequest extends Request {
  user?: AuthenticatedUser;
}

// Express handler types
export type RequestHandler = (req: Request, res: Response, next: NextFunction) => void | Promise<void>;
export type AuthRequestHandler = (req: AuthenticatedRequest, res: Response, next: NextFunction) => void | Promise<void>;
export type OptionalAuthRequestHandler = (req: OptionalAuthRequest, res: Response, next: NextFunction) => void | Promise<void>;

// API Response wrappers - no default 'any' type
export interface ApiResponse<T> {
  success: true;
  data: T;
  message?: string;
  metadata?: {
    timestamp: string;
    requestId?: string;
    version?: string;
  };
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

// JWT Payload with strict typing
export interface JWTPayload {
  id: UserId;
  email: string;
  role: 'client' | 'agent' | 'admin';
  firstName: string;
  lastName: string;
  iat?: number;
  exp?: number;
  sessionId?: string;
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

// Validation schema types - now properly typed
export interface ValidationSchema<
  TBody = unknown,
  TParams = unknown,
  TQuery = unknown
> {
  body?: ZodSchema<TBody>;
  params?: ZodSchema<TParams>;
  query?: ZodSchema<TQuery>;
}

// Common parameter types
export interface IdParams {
  id: string;
}

export interface PropertyParams {
  id: PropertyId;
}

export interface UserParams {
  id: UserId;
}

// Common query parameters
export interface PaginationQuery {
  page?: string;
  limit?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface SearchQuery extends PaginationQuery {
  search?: string;
  keywords?: string;
}

// Database filter interfaces with precise typing
export interface PropertyFilters extends BaseFilters {
  search?: string;
  keyword?: string;
  propertyType?: ('house' | 'condo' | 'townhouse' | 'apartment')[] | ('house' | 'condo' | 'townhouse' | 'apartment');
  status?: 'for_sale' | 'for_rent' | 'sold' | 'rented';
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
  featured?: boolean;
  agentId?: UserId;
}

// Inquiry filter interfaces
export interface InquiryFilters extends BaseFilters {
  propertyId?: PropertyId;
  status?: 'pending' | 'contacted' | 'qualified' | 'closed' | 'spam';
  priority?: 1 | 2 | 3;
  source?: string;
  dateFrom?: string;
  dateTo?: string;
}

// Appointment filter interfaces
export interface AppointmentFilters extends BaseFilters {
  agentId?: UserId;
  propertyId?: PropertyId;
  status?: 'scheduled' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  dateFrom?: string;
  dateTo?: string;
  appointmentType?: 'viewing' | 'consultation' | 'signing';
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

export type UserRole = typeof UserRoles[keyof typeof UserRoles];

// Additional utility types
export interface DatabaseOptions {
  transaction?: boolean;
  timeout?: number;
  retries?: number;
}

export interface CacheOptions {
  ttl?: number;
  key?: string;
  namespace?: string;
}

// File upload types
export interface UploadResult {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
  uploadedAt: Date;
}

export interface FileUploadOptions {
  maxSize?: number;
  allowedTypes?: string[];
  destination?: string;
  generateFilename?: boolean;
}

// Geocoding types
export interface GeocodingResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  placeId?: string;
  confidence?: number;
}

export interface GeocodingOptions {
  timeout?: number;
  provider?: 'google' | 'mapbox';
  country?: string;
  language?: string;
}

// Notification types
export interface NotificationPayload {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  userId?: UserId;
  metadata?: Record<string, unknown>;
}

// Email types
export interface EmailTemplate {
  subject: string;
  htmlBody: string;
  textBody?: string;
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType: string;
}

export interface EmailOptions {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  priority?: 'high' | 'normal' | 'low';
  trackOpens?: boolean;
  trackClicks?: boolean;
}

// Performance monitoring types
export interface PerformanceMetrics {
  duration: number;
  memory: {
    used: number;
    total: number;
  };
  cpu?: {
    usage: number;
  };
  requests?: {
    total: number;
    successful: number;
    failed: number;
  };
}

// Type guards
export function isPropertyId(value: string): value is PropertyId {
  return typeof value === 'string' && value.length > 0;
}

export function isUserId(value: string): value is UserId {
  return typeof value === 'string' && value.length > 0;
}

export function isUserRole(value: string): value is UserRole {
  return Object.values(UserRoles).includes(value as UserRole);
}

// Generic result wrapper
export type Result<TSuccess, TError = Error> = 
  | { success: true; data: TSuccess }
  | { success: false; error: TError };

// Async operation wrapper
export type AsyncResult<TSuccess, TError = Error> = Promise<Result<TSuccess, TError>>;