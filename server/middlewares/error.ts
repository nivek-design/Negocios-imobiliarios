import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError, createErrorResponse, ValidationError } from '../core/errors';
import { config } from '../core/config';
import { createRequestLogger, ContextualLogger, createModuleLogger } from '../core/logger';
import { performanceMonitor } from '../core/monitoring';

/**
 * ENHANCED ERROR TRACKING AND MONITORING SYSTEM
 * Comprehensive error handling with structured logging, categorization, and context preservation
 */

// Error categories for better organization and alerting
export enum ErrorCategory {
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  BUSINESS_LOGIC = 'BUSINESS_LOGIC',
  DATABASE = 'DATABASE',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
  NETWORK = 'NETWORK',
  SYSTEM = 'SYSTEM',
  UNKNOWN = 'UNKNOWN',
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// Enhanced error interface
interface EnhancedError {
  category: ErrorCategory;
  severity: ErrorSeverity;
  originalError: Error | AppError;
  context: {
    requestId?: string;
    userId?: string;
    userAgent?: string;
    ip?: string;
    method: string;
    path: string;
    statusCode: number;
    duration?: number;
    timestamp: string;
  };
  metadata?: Record<string, any>;
}

// Error tracking statistics
const errorStats = {
  total: 0,
  byCategory: new Map<ErrorCategory, number>(),
  bySeverity: new Map<ErrorSeverity, number>(),
  byStatusCode: new Map<number, number>(),
  lastReset: Date.now(),
};

// Module logger for error handling
const errorLogger = createModuleLogger('ErrorHandler');

/**
 * Categorize error based on type and characteristics
 */
function categorizeError(error: Error | AppError): { category: ErrorCategory; severity: ErrorSeverity } {
  // Handle our custom app errors
  if (error instanceof AppError) {
    if (error instanceof ValidationError) {
      return { category: ErrorCategory.VALIDATION, severity: ErrorSeverity.LOW };
    }
    
    switch (error.constructor.name) {
      case 'AuthenticationError':
        return { category: ErrorCategory.AUTHENTICATION, severity: ErrorSeverity.MEDIUM };
      case 'AuthorizationError':
        return { category: ErrorCategory.AUTHORIZATION, severity: ErrorSeverity.MEDIUM };
      case 'NotFoundError':
        return { category: ErrorCategory.BUSINESS_LOGIC, severity: ErrorSeverity.LOW };
      case 'ConflictError':
        return { category: ErrorCategory.BUSINESS_LOGIC, severity: ErrorSeverity.MEDIUM };
      case 'InternalServerError':
        return { category: ErrorCategory.SYSTEM, severity: ErrorSeverity.HIGH };
    }
    
    // Categorize by status code
    if (error.statusCode >= 500) {
      return { category: ErrorCategory.SYSTEM, severity: ErrorSeverity.HIGH };
    } else if (error.statusCode >= 400) {
      return { category: ErrorCategory.BUSINESS_LOGIC, severity: ErrorSeverity.MEDIUM };
    }
  }
  
  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return { category: ErrorCategory.VALIDATION, severity: ErrorSeverity.LOW };
  }
  
  // Handle JWT errors
  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    return { category: ErrorCategory.AUTHENTICATION, severity: ErrorSeverity.MEDIUM };
  }
  
  // Handle database errors
  if (error.message?.includes('duplicate key') || 
      error.message?.includes('unique constraint') ||
      error.message?.includes('foreign key constraint') ||
      error.message?.includes('relation') ||
      error.message?.includes('database')) {
    return { category: ErrorCategory.DATABASE, severity: ErrorSeverity.HIGH };
  }
  
  // Handle network errors
  if (error.message?.includes('ECONNREFUSED') ||
      error.message?.includes('ENOTFOUND') ||
      error.message?.includes('ETIMEDOUT') ||
      error.message?.includes('timeout') ||
      error.message?.includes('network')) {
    return { category: ErrorCategory.NETWORK, severity: ErrorSeverity.HIGH };
  }
  
  // Handle external service errors
  if (error.message?.includes('API') ||
      error.message?.includes('service') ||
      error.message?.includes('external')) {
    return { category: ErrorCategory.EXTERNAL_SERVICE, severity: ErrorSeverity.MEDIUM };
  }
  
  // System errors (memory, file system, etc.)
  if (error.message?.includes('ENOMEM') ||
      error.message?.includes('ENOSPC') ||
      error.message?.includes('EMFILE') ||
      error.message?.includes('system')) {
    return { category: ErrorCategory.SYSTEM, severity: ErrorSeverity.CRITICAL };
  }
  
  // Default categorization
  return { category: ErrorCategory.UNKNOWN, severity: ErrorSeverity.MEDIUM };
}

/**
 * Extract comprehensive context from request
 */
function extractErrorContext(req: Request, statusCode: number, duration?: number): EnhancedError['context'] {
  return {
    requestId: req.requestId || req.headers['x-request-id'] as string,
    userId: (req as any).user?.id,
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.connection.remoteAddress,
    method: req.method,
    path: req.path,
    statusCode,
    duration: duration || (req.startTime ? Date.now() - req.startTime : undefined),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Update error statistics
 */
function updateErrorStats(enhancedError: EnhancedError): void {
  errorStats.total++;
  
  // Update category stats
  const categoryCount = errorStats.byCategory.get(enhancedError.category) || 0;
  errorStats.byCategory.set(enhancedError.category, categoryCount + 1);
  
  // Update severity stats
  const severityCount = errorStats.bySeverity.get(enhancedError.severity) || 0;
  errorStats.bySeverity.set(enhancedError.severity, severityCount + 1);
  
  // Update status code stats
  const statusCount = errorStats.byStatusCode.get(enhancedError.context.statusCode) || 0;
  errorStats.byStatusCode.set(enhancedError.context.statusCode, statusCount + 1);
}

/**
 * Log error with structured data and categorization
 */
function logEnhancedError(enhancedError: EnhancedError, logger: ContextualLogger): void {
  const { category, severity, originalError, context, metadata } = enhancedError;
  
  // Determine log level based on severity
  const logLevel = severity === ErrorSeverity.CRITICAL ? 'error' :
                   severity === ErrorSeverity.HIGH ? 'error' :
                   severity === ErrorSeverity.MEDIUM ? 'warn' : 'info';
  
  // Create comprehensive log entry
  const logData = {
    errorCategory: category,
    errorSeverity: severity,
    statusCode: context.statusCode,
    duration: context.duration,
    errorType: originalError.constructor.name,
    errorMessage: originalError.message,
    stack: config.isDevelopment ? originalError.stack : undefined,
    userId: context.userId,
    requestId: context.requestId,
    userAgent: context.userAgent,
    ip: context.ip,
    method: context.method,
    path: context.path,
    timestamp: context.timestamp,
    ...metadata,
  };
  
  // Update logger context
  logger.updateContext({
    requestId: context.requestId,
    userId: context.userId,
    ip: context.ip,
    method: context.method,
    path: context.path,
    statusCode: context.statusCode,
  });
  
  // Log based on level
  switch (logLevel) {
    case 'error':
      logger.error(`${category} Error: ${originalError.message}`, originalError, logData);
      break;
    case 'warn':
      logger.warn(`${category} Warning: ${originalError.message}`, logData);
      break;
    default:
      logger.info(`${category} Issue: ${originalError.message}`, logData);
  }
  
  // Log security events for authentication/authorization errors
  if (category === ErrorCategory.AUTHENTICATION || category === ErrorCategory.AUTHORIZATION) {
    logger.logSecurityEvent({
      type: category === ErrorCategory.AUTHENTICATION ? 'AUTH_FAILURE' : 'AUTHORIZATION_FAILURE',
      severity: severity === ErrorSeverity.CRITICAL ? 'CRITICAL' : 
               severity === ErrorSeverity.HIGH ? 'HIGH' : 'MEDIUM',
      userId: context.userId,
      ip: context.ip,
      userAgent: context.userAgent,
      details: {
        error: originalError.message,
        path: context.path,
        method: context.method,
        statusCode: context.statusCode,
      },
    });
  }
  
  // Record performance metrics for slow errors
  if (context.duration && context.duration > 1000) { // > 1 second
    logger.logPerformance({
      operation: `Error Handling: ${context.method} ${context.path}`,
      duration: context.duration,
      success: false,
      timestamp: context.timestamp,
      context: {
        requestId: context.requestId,
        statusCode: context.statusCode,
        errorCategory: category,
      },
    });
  }
}

/**
 * Enhanced error handling middleware
 * Must be the last middleware in the chain
 */
export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Get or create logger for this request
  const logger = req.logger || createRequestLogger(req);
  
  // Categorize the error
  const { category, severity } = categorizeError(error);
  
  // Determine status code for the error
  let statusCode: number;
  let finalError: AppError;
  
  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const validationError = new ValidationError(
      'Validation failed',
      undefined,
      error.errors.reduce((acc, err) => {
        const field = err.path.join('.');
        if (!acc[field]) acc[field] = [];
        acc[field].push(err.message);
        return acc;
      }, {} as Record<string, string[]>)
    );
    statusCode = validationError.statusCode;
    finalError = validationError;
    
  // Handle our custom app errors
  } else if (error instanceof AppError) {
    statusCode = error.statusCode;
    finalError = error;
    
  // Handle JWT errors
  } else if (error.name === 'JsonWebTokenError') {
    finalError = new AppError('Token inválido', 401);
    statusCode = 401;
    
  } else if (error.name === 'TokenExpiredError') {
    finalError = new AppError('Token expirado', 401);
    statusCode = 401;
    
  // Handle database errors (Drizzle/PostgreSQL)
  } else if (error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
    finalError = new AppError('Recurso já existe', 409);
    statusCode = 409;
    
  // Handle foreign key constraint errors
  } else if (error.message?.includes('foreign key constraint')) {
    finalError = new AppError('Referência inválida', 400);
    statusCode = 400;
    
  // Default to generic internal server error
  } else {
    finalError = new AppError('Erro interno do servidor', 500, false);
    statusCode = 500;
  }
  
  // Create enhanced error object
  const enhancedError: EnhancedError = {
    category,
    severity,
    originalError: error,
    context: extractErrorContext(req, statusCode, duration),
    metadata: {
      finalErrorType: finalError.constructor.name,
      finalErrorMessage: finalError.message,
      originalErrorType: error.constructor.name,
      originalErrorMessage: error.message,
    },
  };
  
  // Update error statistics
  updateErrorStats(enhancedError);
  
  // Log the enhanced error
  logEnhancedError(enhancedError, logger);
  
  // Record performance metrics for the error
  performanceMonitor.recordHttpRequest(req.method, req.path, duration || 0, statusCode);
  
  // Create error response
  const errorResponse = createErrorResponse(
    finalError,
    req.path,
    config.isDevelopment
  );
  
  // Send response
  res.status(statusCode).json(errorResponse);
};

/**
 * Enhanced Not Found middleware
 * Handles routes that don't exist with structured logging
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const logger = req.logger || createRequestLogger(req);
  const error = new AppError(`Route ${req.originalUrl} not found`, 404);
  
  // Log 404 errors for analysis
  logger.warn('Route not found', {
    path: req.originalUrl,
    method: req.method,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
    referer: req.headers.referer,
  });
  
  // Record performance metrics
  const duration = req.startTime ? Date.now() - req.startTime : 0;
  performanceMonitor.recordHttpRequest(req.method, req.path, duration, 404);
  
  const errorResponse = createErrorResponse(
    error,
    req.path,
    config.isDevelopment
  );

  res.status(404).json(errorResponse);
};

/**
 * Get error statistics for monitoring dashboard
 */
export function getErrorStats(): {
  total: number;
  byCategory: Record<string, number>;
  bySeverity: Record<string, number>;
  byStatusCode: Record<string, number>;
  lastReset: string;
  resetAvailable: boolean;
} {
  return {
    total: errorStats.total,
    byCategory: Object.fromEntries(errorStats.byCategory),
    bySeverity: Object.fromEntries(errorStats.bySeverity),
    byStatusCode: Object.fromEntries(errorStats.byStatusCode),
    lastReset: new Date(errorStats.lastReset).toISOString(),
    resetAvailable: errorStats.total > 0,
  };
}

/**
 * Reset error statistics (useful for periodic monitoring)
 */
export function resetErrorStats(): void {
  errorStats.total = 0;
  errorStats.byCategory.clear();
  errorStats.bySeverity.clear();
  errorStats.byStatusCode.clear();
  errorStats.lastReset = Date.now();
  
  errorLogger.info('Error statistics reset', {
    resetAt: new Date().toISOString(),
    resetBy: 'manual',
  });
}

/**
 * Get critical error summary
 */
export function getCriticalErrors(): {
  total: number;
  categories: string[];
  recentThreshold: number;
} {
  const criticalCount = errorStats.bySeverity.get(ErrorSeverity.CRITICAL) || 0;
  const highCount = errorStats.bySeverity.get(ErrorSeverity.HIGH) || 0;
  
  const criticalCategories = Array.from(errorStats.byCategory.entries())
    .filter(([category, count]) => count > 0)
    .map(([category]) => category);
  
  return {
    total: criticalCount + highCount,
    categories: criticalCategories,
    recentThreshold: Date.now() - (60 * 60 * 1000), // Last hour
  };
}

/**
 * Enhanced error middleware for async route handlers
 * Wrapper that ensures async errors are properly caught and logged
 */
export const asyncErrorHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const logger = req.logger || createRequestLogger(req);
    
    Promise.resolve(fn(req, res, next)).catch((error) => {
      // Log the async error with context
      logger.error('Async error caught', error, {
        asyncHandler: true,
        handlerName: fn.name || 'anonymous',
      });
      
      next(error);
    });
  };
};

/**
 * Async error wrapper
 * Catches async errors and passes them to the error handling middleware
 * (This is already implemented in asyncHandler, but keeping for backward compatibility)
 */
export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};