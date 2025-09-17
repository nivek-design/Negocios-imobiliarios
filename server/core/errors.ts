/**
 * Custom Error Classes for Premier Properties Backend
 * Provides structured error handling across the application
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    this.name = this.constructor.name;
  }
}

export class ValidationError extends AppError {
  public readonly field?: string;
  public readonly fields?: Record<string, string[]>;

  constructor(message: string, field?: string, fields?: Record<string, string[]>) {
    super(message, 400);
    this.field = field;
    this.fields = fields;
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  public readonly resource: string;

  constructor(resource: string, identifier?: string) {
    const message = identifier 
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, 404);
    this.resource = resource;
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'Internal server error') {
    super(message, 500);
  }
}

// Error response format
export interface ErrorResponse {
  success: false;
  message: string;
  statusCode: number;
  timestamp: string;
  path: string;
  field?: string;
  fields?: Record<string, string[]>;
  stack?: string;
}

// Helper function to create consistent error responses
export const createErrorResponse = (
  error: AppError | Error, 
  path: string,
  includeStack = false
): ErrorResponse => {
  const response: ErrorResponse = {
    success: false,
    message: error.message,
    statusCode: error instanceof AppError ? error.statusCode : 500,
    timestamp: new Date().toISOString(),
    path,
  };

  // Add validation-specific fields
  if (error instanceof ValidationError) {
    if (error.field) response.field = error.field;
    if (error.fields) response.fields = error.fields;
  }

  // Include stack trace in development
  if (includeStack && error.stack) {
    response.stack = error.stack;
  }

  return response;
};

// Common error messages in Portuguese (as used throughout the app)
export const ErrorMessages = {
  // Authentication
  INVALID_CREDENTIALS: 'Credenciais inválidas',
  EMAIL_REQUIRED: 'Email é obrigatório',
  PASSWORD_REQUIRED: 'Senha é obrigatória',
  EMAIL_INVALID: 'Por favor, insira um email válido',
  PASSWORD_TOO_SHORT: 'A senha deve ter pelo menos 6 caracteres',
  EMAIL_NOT_CONFIRMED: 'Email não confirmado. Verifique seu email para confirmar a conta.',
  LOGOUT_ERROR: 'Erro ao fazer logout',
  
  // Authorization
  ACCESS_DENIED: 'Acesso negado',
  AGENT_ADMIN_ONLY: 'Acesso negado. Apenas corretores e administradores.',
  ADMIN_ONLY: 'Acesso negado. Apenas administradores.',
  PROPERTY_OWNERSHIP_REQUIRED: 'Acesso negado. Você só pode gerenciar seus próprios imóveis.',
  
  // Resources
  PROPERTY_NOT_FOUND: 'Imóvel não encontrado',
  USER_NOT_FOUND: 'Usuário não encontrado',
  INQUIRY_NOT_FOUND: 'Consulta não encontrada',
  APPOINTMENT_NOT_FOUND: 'Agendamento não encontrado',
  
  // Validation
  REQUIRED_FIELD: 'Este campo é obrigatório',
  INVALID_FORMAT: 'Formato inválido',
  
  // Generic
  INTERNAL_SERVER_ERROR: 'Erro interno do servidor',
  FAILED_TO_FETCH: 'Falha ao buscar dados',
} as const;