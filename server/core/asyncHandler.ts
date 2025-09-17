import { RequestHandler, Response, NextFunction } from 'express';
import { createErrorResponse } from './errors';
import { config } from './config';
import { AuthenticatedRequest, OptionalAuthRequest, AuthRequestHandler, OptionalAuthRequestHandler } from './types';

/**
 * Async Handler Wrapper
 * Catches async errors and passes them to the error handling middleware
 */
export const asyncHandler = (fn: RequestHandler): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      console.error('Async handler error:', {
        path: req.path,
        method: req.method,
        error: error.message,
        stack: error.stack,
      });
      
      // Create standardized error response
      const errorResponse = createErrorResponse(
        error, 
        req.path, 
        config.isDevelopment
      );
      
      // Send error response
      res.status(errorResponse.statusCode).json(errorResponse);
    });
  };
};

/**
 * Success Response Helper
 * Creates consistent success responses
 */
export const sendSuccess = <T>(
  res: Response, 
  data: T, 
  message?: string, 
  statusCode: number = 200
): void => {
  res.status(statusCode).json({
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Created Response Helper
 * For resource creation endpoints
 */
export const sendCreated = <T>(
  res: Response, 
  data: T, 
  message?: string
): void => {
  sendSuccess(res, data, message, 201);
};

/**
 * No Content Response Helper
 * For successful operations with no return data
 */
export const sendNoContent = (res: Response): void => {
  res.status(204).end();
};

/**
 * Async Handler for Authenticated Requests
 * Handles AuthenticatedRequest types properly
 */
export const asyncAuthHandler = (fn: AuthRequestHandler): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req as AuthenticatedRequest, res, next)).catch((error) => {
      console.error('Async auth handler error:', {
        path: req.path,
        method: req.method,
        error: error.message,
        stack: error.stack,
      });
      
      // Create standardized error response
      const errorResponse = createErrorResponse(
        error, 
        req.path, 
        config.isDevelopment
      );
      
      // Send error response
      res.status(errorResponse.statusCode).json(errorResponse);
    });
  };
};

/**
 * Async Handler for Optional Auth Requests
 * Handles OptionalAuthRequest types properly
 */
export const asyncOptionalAuthHandler = (fn: OptionalAuthRequestHandler): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req as OptionalAuthRequest, res, next)).catch((error) => {
      console.error('Async optional auth handler error:', {
        path: req.path,
        method: req.method,
        error: error.message,
        stack: error.stack,
      });
      
      // Create standardized error response
      const errorResponse = createErrorResponse(
        error, 
        req.path, 
        config.isDevelopment
      );
      
      // Send error response
      res.status(errorResponse.statusCode).json(errorResponse);
    });
  };
};