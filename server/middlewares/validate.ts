import { z } from 'zod';
import { ValidationError } from '../core/errors';
import { asyncHandler } from '../core/asyncHandler';
import { ValidationSchema } from '../core/types';
import { body, query, param, validationResult, type ValidationChain, type Meta } from 'express-validator';
import { config } from '../core/config';

/**
 * ENHANCED VALIDATION MIDDLEWARE - SECURITY FOCUSED
 * 
 * Combines Zod schema validation with express-validator for comprehensive security:
 * 1. Zod schemas for type safety and structure validation
 * 2. Express-validator for security-focused input sanitization
 * 3. XSS protection and HTML sanitization
 * 4. SQL injection prevention
 * 5. Input length limits and format validation
 * 6. Security logging for validation failures
 */

// Security logger for validation events
const logSecurityEvent = (
  level: 'info' | 'warn' | 'error', 
  message: string, 
  context: Record<string, any> = {}
) => {
  if (!config.security.logging.enableSecurityLogs) return;
  
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    type: 'VALIDATION',
    message,
    ...context,
  };
  
  if (level === 'error') {
    console.error(`[VALIDATION:${level.toUpperCase()}]`, JSON.stringify(logEntry));
  } else if (level === 'warn') {
    console.warn(`[VALIDATION:${level.toUpperCase()}]`, JSON.stringify(logEntry));
  } else {
    console.log(`[VALIDATION:${level.toUpperCase()}]`, JSON.stringify(logEntry));
  }
};

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

/**
 * EXPRESS-VALIDATOR SECURITY ENHANCEMENTS
 * Security-focused validation chains with sanitization
 */

// Custom sanitizer for XSS protection
const sanitizeXSS = (value: string): string => {
  if (!config.security.validation.enableXssProtection) {
    return value;
  }
  
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/data:text\/html/gi, '')
    .replace(/expression\s*\(/gi, '')
    .trim();
};

// Custom validator for SQL injection patterns
const checkSQLInjection = (value: string): boolean => {
  if (!config.security.validation.enableSqlInjectionProtection) {
    return true;
  }
  
  const sqlPatterns = [
    /(\s|^)(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\s/i,
    /(UNION|JOIN)\s+(ALL\s+)?SELECT/i,
    /'\s*(OR|AND)\s*'\w*'\s*=\s*'\w*'/i,
    /;\s*(DROP|DELETE|INSERT|UPDATE)/i,
    /-{2,}|\/{2,}/,
    /\/\*.*\*\//,
    /(xp_|sp_)[a-z_]+/i,
  ];
  
  return !sqlPatterns.some(pattern => pattern.test(value));
};

/**
 * SECURE VALIDATION CHAINS
 * Pre-configured validation chains with security features
 */

// Enhanced email validation with security
export const secureEmail = (): ValidationChain => {
  return body('email')
    .trim()
    .toLowerCase()
    .isEmail()
    .withMessage('Email inválido')
    .isLength({ max: 320 }) // RFC 5322 email max length
    .withMessage('Email muito longo')
    .normalizeEmail({
      gmail_lowercase: true,
      gmail_remove_dots: false,
      gmail_remove_subaddress: false,
      outlookdotcom_lowercase: true,
      yahoo_lowercase: true,
    })
    .custom((value) => {
      // Check for suspicious email patterns
      const suspiciousPatterns = [
        /^[0-9]+@/, // Numeric-only local part
        /\+.*\+/, // Multiple plus signs
        /@.*\.(tk|ml|ga|cf)$/, // Suspicious TLDs
      ];
      
      if (suspiciousPatterns.some(pattern => pattern.test(value))) {
        logSecurityEvent('warn', 'Suspicious email pattern detected', { email: value });
      }
      
      return true;
    });
};

// Enhanced password validation
export const securePassword = (): ValidationChain => {
  return body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Senha deve ter entre 8 e 128 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Senha deve conter ao menos: 1 letra minúscula, 1 maiúscula, 1 número e 1 símbolo')
    .custom((value) => {
      // Check against common passwords
      const commonPasswords = ['password', '123456', 'admin', 'password123'];
      if (commonPasswords.some(pwd => value.toLowerCase().includes(pwd))) {
        throw new Error('Senha muito comum');
      }
      return true;
    });
};

// Secure text input with XSS protection
export const secureText = (field: string, options: { min?: number; max?: number; optional?: boolean } = {}): ValidationChain => {
  const { min = 1, max = config.security.validation.maxInputLength, optional = false } = options;
  
  let chain = body(field).trim();
  
  if (!optional) {
    chain = chain.notEmpty().withMessage(`${field} é obrigatório`);
  }
  
  return chain
    .isLength({ min: optional ? 0 : min, max })
    .withMessage(`${field} deve ter entre ${min} e ${max} caracteres`)
    .customSanitizer(sanitizeXSS)
    .custom(checkSQLInjection)
    .withMessage(`${field} contém caracteres inválidos`);
};

// Secure numeric validation
export const secureNumber = (field: string, options: { min?: number; max?: number; optional?: boolean } = {}): ValidationChain => {
  const { min, max, optional = false } = options;
  
  let chain = body(field);
  
  if (!optional) {
    chain = chain.notEmpty().withMessage(`${field} é obrigatório`);
  }
  
  chain = chain.isNumeric().withMessage(`${field} deve ser um número`);
  
  if (min !== undefined) {
    chain = chain.isFloat({ min }).withMessage(`${field} deve ser pelo menos ${min}`);
  }
  
  if (max !== undefined) {
    chain = chain.isFloat({ max }).withMessage(`${field} não pode ser maior que ${max}`);
  }
  
  return chain.toFloat();
};

// Secure ID validation (UUIDs, nanoid, etc.)
export const secureId = (field: string, optional: boolean = false): ValidationChain => {
  let chain = param(field).trim();
  
  if (!optional) {
    chain = chain.notEmpty().withMessage(`${field} é obrigatório`);
  }
  
  return chain
    .isLength({ min: 1, max: 50 })
    .withMessage(`${field} deve ter entre 1 e 50 caracteres`)
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(`${field} contém caracteres inválidos`)
    .customSanitizer(sanitizeXSS);
};

// Phone number validation
export const securePhone = (field: string, optional: boolean = false): ValidationChain => {
  let chain = body(field).trim();
  
  if (!optional) {
    chain = chain.notEmpty().withMessage(`${field} é obrigatório`);
  }
  
  return chain
    .isLength({ min: 10, max: 15 })
    .withMessage(`${field} deve ter entre 10 e 15 dígitos`)
    .matches(/^[\d\s\+\-\(\)]+$/)
    .withMessage(`${field} deve conter apenas números, espaços e símbolos de telefone`)
    .customSanitizer((value: string) => value.replace(/\D/g, '')); // Remove non-digits
};

// URL validation with security checks
export const secureUrl = (field: string, optional: boolean = false): ValidationChain => {
  let chain = body(field).trim();
  
  if (!optional) {
    chain = chain.notEmpty().withMessage(`${field} é obrigatório`);
  }
  
  return chain
    .isURL({
      protocols: ['http', 'https'],
      require_protocol: true,
      require_valid_protocol: true,
      allow_underscores: false,
    })
    .withMessage(`${field} deve ser uma URL válida`)
    .custom((value) => {
      // Block suspicious or dangerous URLs
      const dangerousPatterns = [
        /javascript:/i,
        /data:/i,
        /vbscript:/i,
        /file:/i,
        /ftp:/i,
      ];
      
      if (dangerousPatterns.some(pattern => pattern.test(value))) {
        throw new Error('URL não permitida');
      }
      
      return true;
    });
};

/**
 * SECURITY VALIDATION MIDDLEWARE
 * Handles express-validator results with security logging
 */
export const handleSecurityValidation = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorArray = errors.array();
    const clientIp = req.ip || req.connection.remoteAddress;
    
    // Log validation failures for security monitoring
    logSecurityEvent('warn', 'Validation failed', {
      ip: clientIp,
      endpoint: req.path,
      method: req.method,
      errors: errorArray.map((err: any) => ({
        field: err.path || err.param || 'unknown',
        message: err.msg,
        value: typeof err.value === 'string' && err.value && err.value.length > 100 
          ? `${err.value.substring(0, 100)}...` 
          : err.value || 'N/A',
      })),
      userAgent: req.get('User-Agent'),
    });
    
    // Categorize errors for enhanced security response
    const securityRelatedErrors = errorArray.filter(err => 
      err.msg.includes('caracteres inválidos') ||
      err.msg.includes('não permitida') ||
      err.msg.includes('suspeito')
    );
    
    if (securityRelatedErrors.length > 0) {
      logSecurityEvent('error', 'Security validation failure - potential attack', {
        ip: clientIp,
        endpoint: req.path,
        method: req.method,
        securityErrors: securityRelatedErrors,
        userAgent: req.get('User-Agent'),
      });
    }
    
    // Enhanced error response
    const validationError = new ValidationError(
      'Dados de entrada inválidos',
      undefined,
      errorArray.reduce((acc: Record<string, string[]>, err: any) => {
        const field = err.path || err.param || 'unknown';
        if (!acc[field]) acc[field] = [];
        acc[field].push(err.msg);
        return acc;
      }, {})
    );
    
    res.status(400).json({
      error: validationError.message,
      code: 'VALIDATION_ERROR',
      details: validationError.fields || {},
      timestamp: new Date().toISOString(),
    });
    return;
  }
  
  next();
};

/**
 * COMBINED VALIDATION MIDDLEWARE
 * Combines Zod and express-validator for comprehensive validation
 */
export const combineValidation = (
  zodSchema?: ValidationSchema,
  expressValidators?: ValidationChain[]
) => {
  return [
    // First apply express-validator chains
    ...(expressValidators || []),
    handleSecurityValidation,
    // Then apply Zod validation
    zodSchema ? validate(zodSchema) : (req: any, res: any, next: any) => next(),
  ];
};

/**
 * VALIDATION HEALTH CHECK
 * Endpoint to check validation system status
 */
export const validationHealthCheck = (req: any, res: any): void => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    validation: {
      zod: true,
      expressValidator: true,
      security: {
        xssProtection: config.security.validation.enableXssProtection,
        sqlInjectionProtection: config.security.validation.enableSqlInjectionProtection,
        htmlSanitization: config.security.validation.enableHtmlSanitization,
        maxInputLength: config.security.validation.maxInputLength,
      },
      logging: config.security.logging.enableSecurityLogs,
    },
  };
  
  res.json(health);
};