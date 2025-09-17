import { z } from 'zod';
import { commonValidations } from '../../middlewares/validate';

/**
 * AUTH VALIDATION SCHEMAS
 * Zod schemas for authentication endpoints validation
 */

// Login request validation
export const loginSchema = z.object({
  email: commonValidations.email,
  password: commonValidations.password,
  rememberMe: z.boolean().optional().default(false),
});

export type LoginRequest = z.infer<typeof loginSchema>;

// Register request validation
export const registerSchema = z.object({
  email: commonValidations.email,
  password: commonValidations.password,
  firstName: z.string().min(1, 'Nome é obrigatório').max(50, 'Nome muito longo'),
  lastName: z.string().min(1, 'Sobrenome é obrigatório').max(50, 'Sobrenome muito longo'),
  role: z.enum(['client', 'agent', 'admin']).optional().default('client'),
});

export type RegisterRequest = z.infer<typeof registerSchema>;

// Admin user creation validation (for admin endpoints)
export const createAdminUserSchema = z.object({
  email: commonValidations.email,
  password: commonValidations.password,
  firstName: z.string().min(1, 'Nome é obrigatório'),
  lastName: z.string().min(1, 'Sobrenome é obrigatório'),
});

export type CreateAdminUserRequest = z.infer<typeof createAdminUserSchema>;

// Agent user creation validation (for admin endpoints)
export const createAgentUserSchema = z.object({
  email: commonValidations.email,
  password: commonValidations.password,
  firstName: z.string().min(1, 'Nome é obrigatório'),
  lastName: z.string().min(1, 'Sobrenome é obrigatório'),
});

export type CreateAgentUserRequest = z.infer<typeof createAgentUserSchema>;