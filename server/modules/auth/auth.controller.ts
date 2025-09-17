import { Response } from 'express';
import jwt from 'jsonwebtoken';
import { AuthService } from './auth.service';
import { asyncHandler, sendSuccess, sendCreated } from '../../core/asyncHandler';
import { clearAuthCookies, setAuthCookie } from '../../core/http';
import { AuthenticatedRequest, OptionalAuthRequest, AuthenticatedUser, convertUserToAuthenticatedUser } from '../../core/types';
import { config } from '../../core/config';
import { storage } from '../../storage';
import { AuthenticationError, ErrorMessages } from '../../core/errors';
import { 
  LoginRequest, 
  RegisterRequest, 
  CreateAdminUserRequest, 
  CreateAgentUserRequest,
  RegisterAgentRequest,
  RegistrationRejectionRequest
} from './auth.validators';

/**
 * AUTH CONTROLLER
 * Handles HTTP requests for authentication endpoints
 * Delegates business logic to AuthService
 */

export class AuthController {
  private authService = new AuthService();

  /**
   * POST /api/auth/login
   * Authenticate user with email/password
   */
  login = asyncHandler(async (req: any, res: Response) => {
    const data: LoginRequest = req.body;
    
    const result = await this.authService.login(data);
    
    if (!result.success) {
      return res.status(result.statusCode || 401).json({
        success: false,
        message: result.error,
      });
    }

    // Set secure cookie
    setAuthCookie(res, result.data.token, data.rememberMe);
    
    // Store in session as fallback authentication method
    if (req.session) {
      req.session.user = convertUserToAuthenticatedUser(result.data.user);
    }
    
    sendSuccess(res, {
      message: "Login realizado com sucesso",
      user: result.data.user,
      token: result.data.token,
      expiresIn: result.data.expiresIn,
    });
  });

  /**
   * POST /api/auth/register
   * Register new user account
   */
  register = asyncHandler(async (req: any, res: Response) => {
    const data: RegisterRequest = req.body;
    
    const result = await this.authService.register(data);
    
    if (!result.success) {
      return res.status(result.statusCode || 400).json({
        success: false,
        message: result.error,
      });
    }

    sendCreated(res, {
      message: result.data.message,
      user: result.data.user,
    });
  });

  /**
   * POST /api/auth/register-agent
   * Register agent with pending approval
   */
  registerAgent = asyncHandler(async (req: any, res: Response) => {
    const data: RegisterAgentRequest = req.body;
    
    const result = await this.authService.registerAgent(data);
    
    if (!result.success) {
      return res.status(result.statusCode || 400).json({
        success: false,
        message: result.error,
      });
    }

    sendCreated(res, {
      message: result.data.message,
      user: result.data.user,
    });
  });

  /**
   * POST /api/auth/logout
   * Sign out user and clear authentication
   */
  logout = asyncHandler(async (req: any, res: Response) => {
    const result = await this.authService.logout();
    
    // Clear authentication cookies
    clearAuthCookies(res);
    
    // Destroy session if exists
    if (req.session && 'user' in req.session) {
      req.session.destroy((err: Error | null) => {
        if (err) {
          console.error("Error destroying session:", err);
          return res.status(500).json({ 
            success: false,
            message: ErrorMessages.LOGOUT_ERROR 
          });
        }
        
        sendSuccess(res, {
          message: result.success ? result.data.message : "Logout realizado com sucesso"
        });
      });
    } else {
      sendSuccess(res, {
        message: result.success ? result.data.message : "Logout realizado com sucesso"
      });
    }
  });

  /**
   * GET /api/auth/user  
   * Get current authenticated user
   */
  getUser = asyncHandler(async (req: any, res: Response) => {
    // Check JWT token first
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.authToken;
    
    if (token) {
      try {
        interface JWTPayload {
          id: string;
          email: string;
          firstName?: string;
          lastName?: string;
          role: string;
          exp?: number;
          iat?: number;
        }
        const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;
        // Return user from JWT payload
        return sendSuccess(res, {
          id: decoded.id,
          email: decoded.email,
          firstName: decoded.firstName,
          lastName: decoded.lastName,
          role: decoded.role
        });
      } catch (error) {
        // JWT invalid, clear cookie and continue to other auth methods
        clearAuthCookies(res);
      }
    }
    
    // Check session-based auth
    if (req.session && 'user' in req.session && req.session.user) {
      return sendSuccess(res, req.session.user);
    }
    
    // Fallback to Replit Auth if available (minimal fallback)
    if (req.isAuthenticated && req.isAuthenticated() && req.user?.claims?.sub) {
      const userId = req.user.claims.sub;
      const result = await this.authService.getUserById(userId);
      
      if (result.success) {
        return sendSuccess(res, result.data);
      }
    }
    
    // No valid authentication found
    throw new AuthenticationError(ErrorMessages.INVALID_CREDENTIALS);
  });

  /**
   * POST /api/auth/admin/create-user
   * Create admin user (admin only)
   */
  createAdminUser = asyncHandler(async (req: any, res: Response) => {
    const authReq = req;
    const data: CreateAdminUserRequest = authReq.body;
    
    const result = await this.authService.createAdminUser(data);
    
    if (!result.success) {
      return res.status(result.statusCode || 400).json({
        success: false,
        message: result.error,
      });
    }

    sendCreated(res, result.data);
  });

  /**
   * POST /api/auth/admin/create-agent
   * Create agent user (admin only)
   */
  createAgentUser = asyncHandler(async (req: any, res: Response) => {
    const authReq = req;
    const data: CreateAgentUserRequest = authReq.body;
    
    const result = await this.authService.createAgentUser(data);
    
    if (!result.success) {
      return res.status(result.statusCode || 400).json({
        success: false,
        message: result.error,
      });
    }

    sendCreated(res, result.data);
  });

  /**
   * GET /api/auth/admin/pending-registrations
   * Get all pending user registrations (super admin only)
   */
  getPendingRegistrations = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await this.authService.getPendingRegistrations();
    
    if (!result.success) {
      return res.status(result.statusCode || 500).json({
        success: false,
        message: result.error,
      });
    }

    sendSuccess(res, {
      users: result.data.users,
      message: result.data.message,
    });
  });

  /**
   * POST /api/auth/admin/approve-registration/:id
   * Approve pending user registration (super admin only)
   */
  approveRegistration = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const adminId = req.user.id;
    
    const result = await this.authService.approveRegistration(id, adminId);
    
    if (!result.success) {
      return res.status(result.statusCode || 400).json({
        success: false,
        message: result.error,
      });
    }

    sendSuccess(res, {
      user: result.data.user,
      message: result.data.message,
    });
  });

  /**
   * POST /api/auth/admin/reject-registration/:id
   * Reject pending user registration (super admin only)
   */
  rejectRegistration = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const adminId = req.user.id;
    const data: RegistrationRejectionRequest = req.body;
    
    const result = await this.authService.rejectRegistration(id, adminId, data);
    
    if (!result.success) {
      return res.status(result.statusCode || 400).json({
        success: false,
        message: result.error,
      });
    }

    sendSuccess(res, {
      user: result.data.user,
      message: result.data.message,
    });
  });
}