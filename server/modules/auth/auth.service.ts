import { signIn, signUp, signOut, getCurrentUser } from '../../authService';
import { storage } from '../../storage';
import { generateToken } from '../../middlewares/auth';
import { 
  AuthenticationError, 
  ValidationError, 
  ErrorMessages,
  ConflictError 
} from '../../core/errors';
import { ServiceResult } from '../../core/types';
import { 
  LoginRequest, 
  RegisterRequest, 
  CreateAdminUserRequest, 
  CreateAgentUserRequest 
} from './auth.validators';

/**
 * AUTH SERVICE
 * Business logic for authentication operations
 * Handles Supabase Auth integration and local user management
 */

export class AuthService {
  /**
   * Authenticate user with email/password
   */
  async login(data: LoginRequest): Promise<ServiceResult<{
    user: any;
    token: string;
    expiresIn: string;
  }>> {
    try {
      // Primary authentication via Supabase Auth
      const result = await signIn(data.email, data.password);
      
      if (!result.session) {
        return {
          success: false,
          error: ErrorMessages.INVALID_CREDENTIALS,
          statusCode: 401,
        };
      }

      const userSession = {
        id: result.userRecord?.id || result.user.id,
        email: result.userRecord?.email || result.user.email || data.email,
        firstName: result.userRecord?.firstName || '',
        lastName: result.userRecord?.lastName || '',
        role: result.userRecord?.role || 'client',
      };
      
      // Generate secure JWT token for subsequent requests
      const token = generateToken(userSession, data.rememberMe);
      
      return {
        success: true,
        data: {
          user: userSession,
          token,
          expiresIn: data.rememberMe ? '30d' : '24h',
        },
      };
    } catch (error: any) {
      console.error("Auth service login error:", error);
      return {
        success: false,
        error: ErrorMessages.INVALID_CREDENTIALS,
        statusCode: 401,
      };
    }
  }

  /**
   * Register new user
   */
  async register(data: RegisterRequest): Promise<ServiceResult<{
    user: any;
    message: string;
  }>> {
    try {
      const result = await signUp(
        data.email, 
        data.password, 
        data.firstName, 
        data.lastName, 
        data.role
      );
      
      return {
        success: true,
        data: {
          user: {
            id: result.user?.id,
            email: result.user?.email,
          },
          message: "Registro realizado com sucesso. Verifique seu email para confirmar a conta.",
        },
      };
    } catch (error: any) {
      console.error("Auth service register error:", error);
      
      // Handle duplicate email error
      if (error.message?.includes('already registered') || error.message?.includes('already exists')) {
        return {
          success: false,
          error: 'Email já está em uso. Tente fazer login ou use outro email.',
          statusCode: 409,
        };
      }
      
      return {
        success: false,
        error: error.message || 'Erro ao criar conta',
        statusCode: 400,
      };
    }
  }

  /**
   * Sign out user
   */
  async logout(): Promise<ServiceResult<{ message: string }>> {
    try {
      await signOut();
      return {
        success: true,
        data: {
          message: "Logout realizado com sucesso",
        },
      };
    } catch (error: any) {
      console.error("Auth service logout error:", error);
      return {
        success: false,
        error: 'Erro ao fazer logout',
        statusCode: 500,
      };
    }
  }

  /**
   * Get current user from token
   */
  async getCurrentUser(token: string): Promise<ServiceResult<any>> {
    try {
      const user = await getCurrentUser(token);
      
      if (!user) {
        return {
          success: false,
          error: 'Token inválido',
          statusCode: 401,
        };
      }

      return {
        success: true,
        data: user,
      };
    } catch (error: any) {
      console.error("Auth service getCurrentUser error:", error);
      return {
        success: false,
        error: 'Token inválido',
        statusCode: 401,
      };
    }
  }

  /**
   * Get user by ID from database
   */
  async getUserById(id: string): Promise<ServiceResult<any>> {
    try {
      const user = await storage.getUser(id);
      
      if (!user) {
        return {
          success: false,
          error: ErrorMessages.USER_NOT_FOUND,
          statusCode: 404,
        };
      }

      return {
        success: true,
        data: user,
      };
    } catch (error: any) {
      console.error("Auth service getUserById error:", error);
      return {
        success: false,
        error: 'Erro ao buscar usuário',
        statusCode: 500,
      };
    }
  }

  /**
   * Create admin user (admin only operation)
   */
  async createAdminUser(data: CreateAdminUserRequest): Promise<ServiceResult<any>> {
    try {
      const result = await signUp(
        data.email,
        data.password,
        data.firstName,
        data.lastName,
        'admin',
        true // Auto-confirm admin users
      );

      return {
        success: true,
        data: {
          user: {
            id: result.user?.id,
            email: result.user?.email,
            role: 'admin',
          },
          message: 'Administrador criado com sucesso',
        },
      };
    } catch (error: any) {
      console.error("Auth service createAdminUser error:", error);
      return {
        success: false,
        error: error.message || 'Erro ao criar administrador',
        statusCode: 400,
      };
    }
  }

  /**
   * Create agent user (admin only operation)
   */
  async createAgentUser(data: CreateAgentUserRequest): Promise<ServiceResult<any>> {
    try {
      const result = await signUp(
        data.email,
        data.password,
        data.firstName,
        data.lastName,
        'agent',
        true // Auto-confirm agent users
      );

      return {
        success: true,
        data: {
          user: {
            id: result.user?.id,
            email: result.user?.email,
            role: 'agent',
          },
          message: 'Corretor criado com sucesso',
        },
      };
    } catch (error: any) {
      console.error("Auth service createAgentUser error:", error);
      return {
        success: false,
        error: error.message || 'Erro ao criar corretor',
        statusCode: 400,
      };
    }
  }
}