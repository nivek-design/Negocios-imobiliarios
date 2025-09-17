import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError, createErrorResponse, ValidationError } from '../core/errors';
import { config } from '../core/config';

/**
 * CENTRALIZED ERROR HANDLING MIDDLEWARE
 * Handles all errors thrown in the application and formats them consistently
 */

/**
 * Main error handling middleware
 * Must be the last middleware in the chain
 */
export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error caught by error handler:', {
    path: req.path,
    method: req.method,
    error: error.message,
    stack: config.isDevelopment ? error.stack : undefined,
  });

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

    const errorResponse = createErrorResponse(
      validationError,
      req.path,
      config.isDevelopment
    );

    return res.status(validationError.statusCode).json(errorResponse);
  }

  // Handle our custom app errors
  if (error instanceof AppError) {
    const errorResponse = createErrorResponse(
      error,
      req.path,
      config.isDevelopment
    );

    return res.status(error.statusCode).json(errorResponse);
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    const authError = new AppError('Token inválido', 401);
    const errorResponse = createErrorResponse(
      authError,
      req.path,
      config.isDevelopment
    );

    return res.status(401).json(errorResponse);
  }

  if (error.name === 'TokenExpiredError') {
    const authError = new AppError('Token expirado', 401);
    const errorResponse = createErrorResponse(
      authError,
      req.path,
      config.isDevelopment
    );

    return res.status(401).json(errorResponse);
  }

  // Handle database errors (Drizzle/PostgreSQL)
  if (error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
    const conflictError = new AppError('Recurso já existe', 409);
    const errorResponse = createErrorResponse(
      conflictError,
      req.path,
      config.isDevelopment
    );

    return res.status(409).json(errorResponse);
  }

  // Handle foreign key constraint errors
  if (error.message?.includes('foreign key constraint')) {
    const badRequestError = new AppError('Referência inválida', 400);
    const errorResponse = createErrorResponse(
      badRequestError,
      req.path,
      config.isDevelopment
    );

    return res.status(400).json(errorResponse);
  }

  // Default to generic internal server error
  const internalError = new AppError('Erro interno do servidor', 500, false);
  const errorResponse = createErrorResponse(
    internalError,
    req.path,
    config.isDevelopment
  );

  // Log unhandled errors for debugging
  console.error('Unhandled error:', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
  });

  res.status(500).json(errorResponse);
};

/**
 * Not Found middleware
 * Handles routes that don't exist
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404);
  const errorResponse = createErrorResponse(
    error,
    req.path,
    config.isDevelopment
  );

  res.status(404).json(errorResponse);
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