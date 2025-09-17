import { z } from 'zod';
import { ValidationError } from '../core/errors';
import { asyncHandler } from '../core/asyncHandler';
import { ValidationSchema } from '../core/types';

/**
 * VALIDATION MIDDLEWARE
 * Uses Zod schemas to validate request body, params, and query parameters
 */

/**
 * Main validation middleware factory
 * Creates middleware that validates different parts of the request
 */
export const validate = (schema: ValidationSchema) => {
  return asyncHandler(async (req, res, next) => {
    const errors: Record<string, string[]> = {};

    // Validate request body
    if (schema.body) {
      try {
        req.body = schema.body.parse(req.body);
      } catch (error) {
        if (error instanceof z.ZodError) {
          errors.body = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        }
      }
    }

    // Validate request parameters
    if (schema.params) {
      try {
        req.params = schema.params.parse(req.params);
      } catch (error) {
        if (error instanceof z.ZodError) {
          errors.params = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        }
      }
    }

    // Validate query parameters
    if (schema.query) {
      try {
        req.query = schema.query.parse(req.query);
      } catch (error) {
        if (error instanceof z.ZodError) {
          errors.query = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        }
      }
    }

    // If there are validation errors, throw ValidationError
    if (Object.keys(errors).length > 0) {
      const errorMessage = 'Validation failed';
      throw new ValidationError(errorMessage, undefined, errors);
    }

    next();
  });
};

/**
 * Body validation middleware
 * Validates only the request body
 */
export const validateBody = (schema: z.ZodSchema) => {
  return validate({ body: schema });
};

/**
 * Params validation middleware
 * Validates only the request parameters
 */
export const validateParams = (schema: z.ZodSchema) => {
  return validate({ params: schema });
};

/**
 * Query validation middleware  
 * Validates only the query parameters
 */
export const validateQuery = (schema: z.ZodSchema) => {
  return validate({ query: schema });
};

// Common parameter schemas
export const commonParams = {
  id: z.object({
    id: z.string().min(1, 'ID is required'),
  }),
  
  propertyId: z.object({
    propertyId: z.string().min(1, 'Property ID is required'),
  }),
  
  agentId: z.object({
    agentId: z.string().min(1, 'Agent ID is required'),
  }),
  
  userId: z.object({
    userId: z.string().min(1, 'User ID is required'),
  }),
};

// Common query schemas
export const commonQuery = {
  pagination: z.object({
    limit: z.string().optional().transform(val => val ? parseInt(val) : undefined),
    offset: z.string().optional().transform(val => val ? parseInt(val) : undefined),
    page: z.string().optional().transform(val => val ? parseInt(val) : undefined),
  }),
  
  search: z.object({
    search: z.string().optional(),
    keyword: z.string().optional(),
  }),
  
  sorting: z.object({
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
};

// Common validation patterns
export const commonValidations = {
  email: z.string().email('Por favor, insira um email válido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
  requiredString: z.string().min(1, 'Este campo é obrigatório'),
  optionalString: z.string().optional(),
  positiveNumber: z.number().positive('Deve ser um número positivo'),
  nonNegativeNumber: z.number().nonnegative('Deve ser um número não negativo'),
};