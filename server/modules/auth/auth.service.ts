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
  CreateAgentUserRequest,
  RegisterAgentRequest,
  RegistrationRejectionRequest
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
   * Register agent with pending approval
   */
  async registerAgent(data: RegisterAgentRequest): Promise<ServiceResult<{
    user: any;
    message: string;
  }>> {
    try {
      // Create pending agent user
      const userData = {
        id: `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        profileImageUrl: data.profileImageUrl || null,
        role: 'agent' as const,
        registrationStatus: 'pending' as const,
        isActive: false,
      };

      const user = await storage.upsertUser(userData);
      console.log(`Agent registration request created for ${data.email} with ID: ${user.id}`);

      return {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            registrationStatus: user.registrationStatus,
          },
          message: "Solicitação de cadastro enviada com sucesso! Aguarde aprovação do administrador para acessar a plataforma.",
        },
      };
    } catch (error: any) {
      console.error("Auth service registerAgent error:", error);
      
      // Handle database constraint errors
      if (error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
        return {
          success: false,
          error: 'Email já está em uso. Use outro email para o cadastro.',
          statusCode: 409,
        };
      }
      
      return {
        success: false,
        error: error.message || 'Erro ao processar solicitação de cadastro',
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

  /**
   * Get all pending user registrations (super admin only)
   */
  async getPendingRegistrations(): Promise<ServiceResult<{
    users: any[];
    message: string;
  }>> {
    try {
      const result = await storage.getUsersByRegistrationStatus('pending');
      
      // Return simplified user data for admin review
      const users = result.data.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        createdAt: user.createdAt,
        profileImageUrl: user.profileImageUrl,
      }));

      return {
        success: true,
        data: {
          users,
          message: `${users.length} cadastros pendentes encontrados`,
        },
      };
    } catch (error: any) {
      console.error("Auth service getPendingRegistrations error:", error);
      return {
        success: false,
        error: 'Erro ao buscar cadastros pendentes',
        statusCode: 500,
      };
    }
  }

  /**
   * Approve pending user registration (super admin only)
   */
  async approveRegistration(id: string, adminId: string): Promise<ServiceResult<{
    user: any;
    message: string;
  }>> {
    try {
      // Check if user exists and is pending
      const existingUser = await storage.getUser(id);
      
      if (!existingUser) {
        return {
          success: false,
          error: 'Usuário não encontrado',
          statusCode: 404,
        };
      }

      if (existingUser.registrationStatus !== 'pending') {
        return {
          success: false,
          error: 'Este cadastro não está pendente de aprovação',
          statusCode: 400,
        };
      }

      // Approve the registration
      const approvedUser = await storage.updateUserRegistrationStatus(id, 'approved', adminId);
      
      console.log(`Registration approved for user ${approvedUser.email} by admin ${adminId}`);

      return {
        success: true,
        data: {
          user: {
            id: approvedUser.id,
            email: approvedUser.email,
            firstName: approvedUser.firstName,
            lastName: approvedUser.lastName,
            role: approvedUser.role,
            registrationStatus: approvedUser.registrationStatus,
            approvedAt: approvedUser.approvedAt,
          },
          message: `Cadastro de ${approvedUser.firstName} ${approvedUser.lastName} aprovado com sucesso`,
        },
      };
    } catch (error: any) {
      console.error("Auth service approveRegistration error:", error);
      return {
        success: false,
        error: error.message || 'Erro ao aprovar cadastro',
        statusCode: 500,
      };
    }
  }

  /**
   * Reject pending user registration (super admin only)
   */
  async rejectRegistration(id: string, adminId: string, data: RegistrationRejectionRequest): Promise<ServiceResult<{
    user: any;
    message: string;
  }>> {
    try {
      // Check if user exists and is pending
      const existingUser = await storage.getUser(id);
      
      if (!existingUser) {
        return {
          success: false,
          error: 'Usuário não encontrado',
          statusCode: 404,
        };
      }

      if (existingUser.registrationStatus !== 'pending') {
        return {
          success: false,
          error: 'Este cadastro não está pendente de aprovação',
          statusCode: 400,
        };
      }

      // Reject the registration
      const rejectedUser = await storage.updateUserRegistrationStatus(
        id, 
        'rejected', 
        adminId, 
        data.rejectionReason
      );
      
      console.log(`Registration rejected for user ${rejectedUser.email} by admin ${adminId}: ${data.rejectionReason}`);

      return {
        success: true,
        data: {
          user: {
            id: rejectedUser.id,
            email: rejectedUser.email,
            firstName: rejectedUser.firstName,
            lastName: rejectedUser.lastName,
            role: rejectedUser.role,
            registrationStatus: rejectedUser.registrationStatus,
            rejectedAt: rejectedUser.rejectedAt,
            rejectionReason: rejectedUser.rejectionReason,
          },
          message: `Cadastro de ${rejectedUser.firstName} ${rejectedUser.lastName} rejeitado`,
        },
      };
    } catch (error: any) {
      console.error("Auth service rejectRegistration error:", error);
      return {
        success: false,
        error: error.message || 'Erro ao rejeitar cadastro',
        statusCode: 500,
      };
    }
  }
}