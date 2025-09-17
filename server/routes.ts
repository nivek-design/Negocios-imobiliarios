import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertPropertySchema, insertInquirySchema, insertAppointmentSchema } from "@shared/schema";
import { ZodError } from "zod";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { geocodingService } from "./geocoding";
import { sendEmail, generateAppointmentConfirmationEmail, generateAppointmentReminderEmail } from "./emailService";
import { notificationService } from "./notificationService";
import { signIn, signUp, signOut, getCurrentUser, createAdminUser, createAgentUser } from "./authService";
import jwt from "jsonwebtoken";
import { promisify } from "util";

export async function registerRoutes(app: Express): Promise<Server> {
  /**
   * SIMPLIFIED AUTHENTICATION ARCHITECTURE
   * 
   * This application uses a streamlined authentication system with the following priorities:
   * 
   * 1. PRIMARY: JWT Tokens from Supabase Auth
   *    - Most efficient and secure method
   *    - Stored in HTTP-only cookies for security
   *    - Contains user ID, email, role, and names
   * 
   * 2. FALLBACK: Session-based auth
   *    - For compatibility during transition periods
   *    - Stored in req.session.user
   * 
   * 3. MINIMAL REPLIT FALLBACK: Only when absolutely necessary
   *    - Maintains compatibility with Replit environment
   *    - Used only if JWT and session auth fail
   * 
   * User object is standardized across all auth methods with:
   * - id: string (primary user identifier)
   * - email: string
   * - firstName: string
   * - lastName: string  
   * - role: 'client' | 'agent' | 'admin'
   * - claims: { sub: string } (for backward compatibility)
   */
  
  // Initialize Replit Auth (minimal setup for compatibility)
  await setupAuth(app);

  // JWT Secret (in production this should be in environment variables)
  const JWT_SECRET = process.env.JWT_SECRET || "premier-properties-secret-key-2024";
  
  /**
   * JWT Token Generation for Supabase Auth
   * Creates secure tokens containing user data for stateless authentication
   */
  const generateToken = (user: any, rememberMe: boolean = false) => {
    const expiresIn = rememberMe ? '30d' : '24h';
    return jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName 
      },
      JWT_SECRET,
      { expiresIn }
    );
  };

  /**
   * FIXED Authentication Middleware - Production Ready
   * PRIORITY ORDER: Cookie authToken > Authorization header > Supabase JWT validation > Session > Replit
   * NEVER clears cookies unless explicitly intended
   * Standardizes user object format across all auth methods
   */
  const customIsAuthenticated = async (req: any, res: any, next: any) => {
    // Extract user ID consistently from any auth method
    const getUserId = (user: any) => {
      return user?.id || user?.claims?.sub || user?.sub;
    };

    // Extract user role consistently from any auth method  
    const getUserRole = (user: any) => {
      return user?.role || user?.userRole || 'client';
    };

    // Standardize user object format
    const standardizeUser = (userData: any) => {
      const userId = getUserId(userData);
      const userRole = getUserRole(userData);
      
      return {
        id: userId,
        email: userData.email,
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        role: userRole,
        claims: { sub: userId }, // For backward compatibility
      };
    };

    // 1. PRIMARY: Check cookie authToken first (most secure for web apps)
    const cookieToken = req.cookies?.authToken;
    if (cookieToken) {
      try {
        const decoded = jwt.verify(cookieToken, JWT_SECRET) as any;
        req.user = standardizeUser(decoded);
        return next();
      } catch (error) {
        // Only clear cookie if it was actually invalid, not if authorization header fails
        res.clearCookie('authToken');
      }
    }

    // 2. SECONDARY: Check Authorization header (for API clients)
    const authHeaderToken = req.headers.authorization?.replace('Bearer ', '');
    if (authHeaderToken) {
      try {
        const decoded = jwt.verify(authHeaderToken, JWT_SECRET) as any;
        req.user = standardizeUser(decoded);
        return next();
      } catch (error) {
        // DO NOT clear cookie here - authorization header failure shouldn't affect cookie auth
        // Continue to fallback methods
      }
    }

    // 3. FALLBACK: Supabase JWT validation using supabase.auth.getUser()
    const token = cookieToken || authHeaderToken;
    if (token) {
      try {
        const { getCurrentUser } = await import('./authService');
        const supabaseUser = await getCurrentUser(token);
        if (supabaseUser) {
          req.user = standardizeUser(supabaseUser);
          return next();
        }
      } catch (error) {
        // Supabase validation failed, continue to session auth
      }
    }
    
    // 4. FALLBACK: Check session-based auth for compatibility
    if (req.session?.user) {
      req.user = standardizeUser(req.session.user);
      return next();
    }
    
    // 5. MINIMAL REPLIT FALLBACK: Only if absolutely necessary
    if (req.isAuthenticated && req.isAuthenticated() && req.user?.claims?.sub) {
      req.user = standardizeUser(req.user);
      return next();
    }
    
    // No valid authentication found
    return res.status(401).json({ message: "Unauthorized" });
  };

  /**
   * Consolidated Role-Based Access Control Middleware
   * Simplifies role checking with consistent user data access
   */
  
  // Helper function to check user roles consistently
  const checkUserRole = (req: any, allowedRoles: string[]) => {
    const userRole = req.user?.role;
    return userRole && allowedRoles.includes(userRole);
  };

  // Basic authentication requirement
  const requireAuth = customIsAuthenticated;

  // Agent or Admin access required
  const requireAgent = (req: any, res: any, next: any) => {
    customIsAuthenticated(req, res, () => {
      if (!checkUserRole(req, ['agent', 'admin'])) {
        return res.status(403).json({ message: "Acesso negado. Apenas corretores e administradores." });
      }
      next();
    });
  };

  // Admin-only access required
  const requireAdmin = (req: any, res: any, next: any) => {
    customIsAuthenticated(req, res, () => {
      if (!checkUserRole(req, ['admin'])) {
        return res.status(403).json({ message: "Acesso negado. Apenas administradores." });
      }
      next();
    });
  };

  /**
   * Property Ownership Middleware - Simplified with consistent user access
   * Ensures agents can only access their own properties, admins can access all
   */
  const requirePropertyOwnership = async (req: any, res: any, next: any) => {
    try {
      const userId = req.user?.id; // Simplified - always use req.user.id
      const userRole = req.user?.role;
      const property = await storage.getProperty(req.params.id);
      
      if (!property) {
        return res.status(404).json({ message: "Imóvel não encontrado" });
      }
      
      // Admin can access any property
      if (userRole === 'admin') {
        req.property = property;
        return next();
      }
      
      // Agent can only access their own properties
      if (property.agentId !== userId) {
        return res.status(403).json({ message: "Acesso negado. Você só pode gerenciar seus próprios imóveis." });
      }
      
      req.property = property;
      next();
    } catch (error) {
      console.error("Error checking property ownership:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  };

  // Object storage service routes
  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", requireAuth, async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    res.json({ uploadURL });
  });

  app.put("/api/property-images", requireAuth, async (req: any, res) => {
    if (!req.body.imageURL) {
      return res.status(400).json({ error: "imageURL is required" });
    }

    const userId = req.user.id; // Simplified user ID access

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.imageURL,
        {
          owner: userId,
          visibility: "public",
        },
      );

      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error setting property image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Config routes
  app.get('/api/config/maps', async (req, res) => {
    res.json({ apiKey: process.env.GOOGLE_MAPS_API_KEY || '' });
  });

  /**
   * AUTHENTICATION ROUTES
   * 
   * These routes handle user authentication using Supabase Auth as the primary method,
   * with JWT tokens for subsequent requests and session storage as fallback.
   */
  
  // Login endpoint - uses Supabase Auth + JWT tokens
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password, rememberMe = false } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email e senha são obrigatórios" });
      }
      
      // Validação básica de formato
      if (!email.includes('@')) {
        return res.status(400).json({ message: "Por favor, insira um email válido" });
      }
      
      if (password.length < 6) {
        return res.status(400).json({ message: "A senha deve ter pelo menos 6 caracteres" });
      }
      
      // Primary authentication via Supabase Auth
      // This handles email/password verification and returns user data
      const result = await signIn(email, password);
      
      if (!result.session) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }

      const userSession = {
        id: result.userRecord?.id || result.user.id,
        email: result.userRecord?.email || result.user.email || email,
        firstName: result.userRecord?.firstName || '',
        lastName: result.userRecord?.lastName || '',
        role: result.userRecord?.role || 'client',
      };
      
      // Generate secure JWT token for subsequent requests
      const token = generateToken(userSession, rememberMe);
      
      // Store in session as fallback authentication method
      (req.session as any).user = userSession;
      
      // Set secure cookie
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
        maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000, // 30 days or 24 hours
      };
      
      res.cookie('authToken', token, cookieOptions);
      
      res.json({
        message: "Login realizado com sucesso",
        user: userSession,
        token,
        expiresIn: rememberMe ? '30d' : '24h'
      });
    } catch (error) {
      console.error("Error during login:", error);
      res.status(401).json({ message: "Credenciais inválidas" });
    }
  });

  // Registration route
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, firstName, lastName, role = 'client' } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email e senha são obrigatórios" });
      }
      
      if (password.length < 6) {
        return res.status(400).json({ message: "A senha deve ter pelo menos 6 caracteres" });
      }
      
      const result = await signUp(email, password, firstName, lastName, role);
      
      res.json({
        message: "Registro realizado com sucesso. Verifique seu email para confirmar a conta.",
        user: {
          id: result.user?.id,
          email: result.user?.email
        }
      });
    } catch (error: any) {
      console.error("Error during registration:", error);
      res.status(400).json({ message: error.message || "Erro ao criar conta" });
    }
  });

  // Simplified logout route - handles all auth methods properly
  app.post('/api/auth/logout', async (req: any, res) => {
    try {
      // Attempt to sign out from Supabase Auth
      await signOut();
      
      // Clear JWT authentication cookie with proper options
      res.clearCookie('authToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/'
      });
      
      // Clear session cookie
      res.clearCookie('connect.sid', {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
      });
      
      // Destroy session if exists
      if (req.session?.user) {
        req.session.destroy((err: any) => {
          if (err) {
            console.error("Error destroying session:", err);
            return res.status(500).json({ message: "Erro ao fazer logout" });
          }
          return res.json({ message: "Logout realizado com sucesso" });
        });
      } else {
        res.json({ message: "Logout realizado com sucesso" });
      }
    } catch (error) {
      console.error("Error during logout:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.get('/api/auth/user', async (req: any, res) => {
    try {
      // Check JWT token first
      const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.authToken;
      
      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          // Return user from JWT payload
          return res.json({
            id: decoded.id,
            email: decoded.email,
            firstName: decoded.firstName,
            lastName: decoded.lastName,
            role: decoded.role
          });
        } catch (error) {
          // JWT invalid, clear cookie and continue to other auth methods
          res.clearCookie('authToken');
        }
      }
      
      // Check session-based auth
      if (req.session?.user) {
        return res.json(req.session.user);
      }
      
      // Fallback to Replit Auth if available (minimal fallback)
      if (req.isAuthenticated && req.isAuthenticated() && req.user?.claims?.sub) {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);
        if (user) {
          return res.json(user);
        }
      }
      
      // No valid authentication found
      return res.status(401).json({ message: "Unauthorized" });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });


  /**
   * PROPERTY ROUTES
   * 
   * These routes handle property-related operations.
   * Some routes require authentication, others are public.
   * All use the simplified authentication middleware.
   */
  
  // Public route - fetch properties with filters
  app.get("/api/properties", async (req, res) => {
    try {
      const filters = {
        search: req.query.search && req.query.search !== '' ? req.query.search as string : undefined,
        keyword: req.query.keyword && req.query.keyword !== '' ? req.query.keyword as string : undefined,
        propertyType: Array.isArray(req.query.propertyType) && req.query.propertyType.length > 0 ? req.query.propertyType as string[] : undefined,
        status: req.query.status && req.query.status !== 'all' && req.query.status !== '' ? req.query.status as string : undefined,
        city: req.query.city && req.query.city !== '' ? req.query.city as string : undefined,
        minPrice: req.query.minPrice ? parseInt(req.query.minPrice as string) : undefined,
        maxPrice: req.query.maxPrice ? parseInt(req.query.maxPrice as string) : undefined,
        bedrooms: req.query.bedrooms && req.query.bedrooms !== 'any' && req.query.bedrooms !== '' ? parseInt(req.query.bedrooms as string) : undefined,
        bathrooms: req.query.bathrooms && req.query.bathrooms !== 'any' && req.query.bathrooms !== '' ? parseInt(req.query.bathrooms as string) : undefined,
        // Location filters
        latitude: req.query.latitude ? parseFloat(req.query.latitude as string) : undefined,
        longitude: req.query.longitude ? parseFloat(req.query.longitude as string) : undefined,
        radius: req.query.radius && req.query.radius !== 'any' ? parseInt(req.query.radius as string) : undefined,
        // Property features
        hasGarage: req.query.hasGarage === 'true' ? true : req.query.hasGarage === 'false' ? false : undefined,
        hasPool: req.query.hasPool === 'true' ? true : req.query.hasPool === 'false' ? false : undefined,
        hasBalcony: req.query.hasBalcony === 'true' ? true : req.query.hasBalcony === 'false' ? false : undefined,
        hasGarden: req.query.hasGarden === 'true' ? true : req.query.hasGarden === 'false' ? false : undefined,
        hasAirConditioning: req.query.hasAirConditioning === 'true' ? true : req.query.hasAirConditioning === 'false' ? false : undefined,
        hasFireplace: req.query.hasFireplace === 'true' ? true : req.query.hasFireplace === 'false' ? false : undefined,
        hasPetsAllowed: req.query.hasPetsAllowed === 'true' ? true : req.query.hasPetsAllowed === 'false' ? false : undefined,
        sortBy: req.query.sortBy as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      };
      
      const properties = await storage.getProperties(filters);
      res.json(properties);
    } catch (error) {
      console.error("Error fetching properties:", error);
      res.status(500).json({ message: "Failed to fetch properties" });
    }
  });

  app.get("/api/properties/featured", async (req, res) => {
    try {
      const properties = await storage.getFeaturedProperties();
      res.json(properties);
    } catch (error) {
      console.error("Error fetching featured properties:", error);
      res.status(500).json({ message: "Failed to fetch featured properties" });
    }
  });

  app.get("/api/properties/:id", async (req, res) => {
    try {
      const property = await storage.getProperty(req.params.id);
      if (!property) {
        return res.status(404).json({ message: "Imóvel não encontrado" });
      }
      res.json(property);
    } catch (error) {
      console.error("Error fetching property:", error);
      res.status(500).json({ message: "Failed to fetch property" });
    }
  });

  // Record property view - simplified user ID access
  app.post("/api/properties/:id/view", async (req: any, res) => {
    try {
      const propertyId = req.params.id;
      const userId = req.user?.id || null; // Simplified user ID access
      const ipAddress = req.ip || req.connection.remoteAddress || null;
      
      await storage.createPropertyView({
        propertyId,
        userId,
        ipAddress
      });
      
      res.status(201).json({ message: "View recorded" });
    } catch (error) {
      console.error("Error recording property view:", error);
      res.status(500).json({ message: "Failed to record view" });
    }
  });

  // Add property to favorites - use simplified auth middleware
  app.post("/api/properties/:id/favorite", requireAuth, async (req: any, res) => {
    try {
      const propertyId = req.params.id;
      const userId = req.user.id; // Simplified user ID access
      
      await storage.createPropertyFavorite({
        propertyId,
        userId,
      });
      
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error adding property to favorites:", error);
      res.status(500).json({ message: "Falha ao adicionar aos favoritos" });
    }
  });

  // Remove property from favorites - use simplified auth middleware
  app.delete("/api/properties/:id/favorite", requireAuth, async (req: any, res) => {
    try {
      const propertyId = req.params.id;
      const userId = req.user.id; // Simplified user ID access
      
      await storage.removePropertyFavorite(propertyId, userId);
      
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error removing property from favorites:", error);
      res.status(500).json({ message: "Falha ao remover dos favoritos" });
    }
  });

  // Check if property is favorited by user - use simplified auth middleware
  app.get("/api/properties/:id/is-favorited", requireAuth, async (req: any, res) => {
    try {
      const propertyId = req.params.id;
      const userId = req.user.id; // Simplified user ID access
      
      const isFavorited = await storage.isPropertyFavorited(propertyId, userId);
      
      res.json({ isFavorited });
    } catch (error) {
      console.error("Error checking if property is favorited:", error);
      res.status(500).json({ message: "Failed to check favorite status" });
    }
  });

  // Get user favorites - use simplified auth middleware
  app.get("/api/user/favorites", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id; // Simplified user ID access
      const favorites = await storage.getUserFavorites(userId);
      res.json(favorites);
    } catch (error) {
      console.error("Error fetching user favorites:", error);
      res.status(500).json({ message: "Failed to fetch favorites" });
    }
  });

  app.post("/api/properties", requireAgent, async (req: any, res) => {
    try {
      const userId = req.user.id; // Simplified user ID access
      const propertyData = insertPropertySchema.parse({
        ...req.body,
        agentId: userId,
      });
      
      const property = await storage.createProperty(propertyData);
      res.status(201).json(property);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Erro de validação", errors: error.errors });
      }
      console.error("Error creating property:", error);
      res.status(500).json({ message: "Falha ao criar imóvel" });
    }
  });

  app.put("/api/properties/:id", requireAgent, requirePropertyOwnership, async (req: any, res) => {
    try {
      const updateData = insertPropertySchema.partial().parse(req.body);
      const updatedProperty = await storage.updateProperty(req.params.id, updateData);
      res.json(updatedProperty);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Erro de validação", errors: error.errors });
      }
      console.error("Error updating property:", error);
      res.status(500).json({ message: "Falha ao atualizar imóvel" });
    }
  });

  app.delete("/api/properties/:id", requireAgent, requirePropertyOwnership, async (req: any, res) => {
    try {
      await storage.deleteProperty(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting property:", error);
      res.status(500).json({ message: "Falha ao excluir imóvel" });
    }
  });

  app.get("/api/agent/properties", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id; // Simplified user ID access
      const properties = await storage.getPropertiesByAgent(userId);
      res.json(properties);
    } catch (error) {
      console.error("Error fetching agent properties:", error);
      res.status(500).json({ message: "Failed to fetch properties" });
    }
  });

  /**
   * INQUIRY ROUTES
   * 
   * Handle property inquiries and related operations.
   * Uses simplified authentication middleware for protected routes.
   */
  
  // Public route - create inquiry
  app.post("/api/inquiries", async (req, res) => {
    try {
      const inquiryData = insertInquirySchema.parse(req.body);
      const inquiry = await storage.createInquiry(inquiryData);
      res.status(201).json(inquiry);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Erro de validação", errors: error.errors });
      }
      console.error("Error creating inquiry:", error);
      res.status(500).json({ message: "Failed to create inquiry" });
    }
  });

  app.get("/api/agent/inquiries", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id; // Simplified user ID access
      const inquiries = await storage.getInquiriesByAgent(userId);
      res.json(inquiries);
    } catch (error) {
      console.error("Error fetching inquiries:", error);
      res.status(500).json({ message: "Failed to fetch inquiries" });
    }
  });

  // Get agent metrics - simplified user ID access
  app.get("/api/agent/metrics", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id; // Simplified user ID access
      const metrics = await storage.getAgentMetrics(userId);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching agent metrics:", error);
      res.status(500).json({ message: "Failed to fetch metrics" });
    }
  });

  app.get("/api/properties/:id/inquiries", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id; // Simplified user ID access
      const property = await storage.getProperty(req.params.id);
      
      if (!property) {
        return res.status(404).json({ message: "Imóvel não encontrado" });
      }
      
      if (property.agentId !== userId) {
        return res.status(403).json({ message: "Not authorized to view inquiries for this property" });
      }
      
      const inquiries = await storage.getInquiriesForProperty(req.params.id);
      res.json(inquiries);
    } catch (error) {
      console.error("Error fetching property inquiries:", error);
      res.status(500).json({ message: "Failed to fetch inquiries" });
    }
  });

  // Geocoding route - add coordinates to property
  app.post("/api/properties/:id/geocode", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const property = await storage.getProperty(req.params.id);
      
      if (!property) {
        return res.status(404).json({ message: "Imóvel não encontrado" });
      }
      
      if (property.agentId !== userId) {
        return res.status(403).json({ message: "Not authorized to update this property" });
      }
      
      if (property.latitude && property.longitude) {
        return res.json({ 
          message: "Property already has coordinates",
          latitude: property.latitude,
          longitude: property.longitude
        });
      }
      
      const coordinates = await geocodingService.geocodeAddress(
        property.address,
        property.city,
        property.state,
        property.zipCode
      );
      
      if (!coordinates) {
        return res.status(400).json({ message: "Could not geocode address" });
      }
      
      const updatedProperty = await storage.updateProperty(req.params.id, {
        latitude: coordinates.latitude.toString(),
        longitude: coordinates.longitude.toString(),
      });
      
      res.json({
        message: "Coordinates added successfully",
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        property: updatedProperty
      });
    } catch (error) {
      console.error("Error geocoding property:", error);
      res.status(500).json({ message: "Failed to geocode property" });
    }
  });

  // ===== APPOINTMENT ROUTES =====
  
  // Create new appointment
  app.post("/api/appointments", async (req, res) => {
    try {
      const appointmentData = insertAppointmentSchema.parse(req.body);
      const appointment = await storage.createAppointment(appointmentData);
      
      // Send confirmation email to client
      try {
        // Get property details for the email
        const property = await storage.getProperty(appointment.propertyId);
        const propertyTitle = property?.title || "Propriedade";
        const propertyAddress = property?.address || "";
        
        // Get agent details (if available)
        const agent = await storage.getUser(appointment.agentId);
        const agentName = agent ? `${agent.firstName || ''} ${agent.lastName || ''}`.trim() : "";
        
        const emailData = generateAppointmentConfirmationEmail({
          clientName: appointment.clientName,
          propertyTitle,
          appointmentDate: appointment.appointmentDate.toISOString(),
          propertyAddress,
          agentName,
          agentPhone: "", // Could be added to agent profile
        });

        await sendEmail({
          to: appointment.clientEmail,
          from: "noreply@premierproperties.com", // Update with your verified sender
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text,
        });

        console.log(`Confirmation email sent to ${appointment.clientEmail}`);
      } catch (emailError) {
        console.error("Failed to send confirmation email:", emailError);
        // Don't fail the request if email fails
      }
      
      res.status(201).json(appointment);
    } catch (error) {
      console.error("Error creating appointment:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Invalid appointment data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create appointment" });
    }
  });

  // Get agent's appointments
  app.get("/api/agent/appointments", customIsAuthenticated, async (req: any, res) => {
    try {
      // Get user ID from custom session or Replit session
      const userId = req.session?.user?.id || req.user?.claims?.sub;
      const appointments = await storage.getAppointmentsByAgent(userId);
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      res.status(500).json({ message: "Failed to fetch appointments" });
    }
  });

  // Get property's appointments
  app.get("/api/properties/:propertyId/appointments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { propertyId } = req.params;
      
      // Verify the property belongs to the authenticated agent
      const property = await storage.getProperty(propertyId);
      if (!property || property.agentId !== userId) {
        return res.status(403).json({ message: "Not authorized to view these appointments" });
      }
      
      const appointments = await storage.getAppointmentsByProperty(propertyId);
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching property appointments:", error);
      res.status(500).json({ message: "Failed to fetch appointments" });
    }
  });

  // Get available time slots for an agent on a specific date
  app.get("/api/agents/:agentId/available-slots", async (req, res) => {
    try {
      const { agentId } = req.params;
      const { date } = req.query;
      
      if (!date || typeof date !== 'string') {
        return res.status(400).json({ message: "Date parameter is required" });
      }
      
      const availableSlots = await storage.getAgentAvailableSlots(agentId, date);
      res.json(availableSlots);
    } catch (error) {
      console.error("Error fetching available slots:", error);
      res.status(500).json({ message: "Failed to fetch available slots" });
    }
  });

  // Update appointment status
  app.put("/api/appointments/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      
      const originalAppointment = await storage.getAppointment(id);
      if (!originalAppointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      
      // Only the agent can update appointment
      if (originalAppointment.agentId !== userId) {
        return res.status(403).json({ message: "Not authorized to update this appointment" });
      }
      
      const updates = req.body;
      const updatedAppointment = await storage.updateAppointment(id, updates);
      
      // Send notifications based on the type of update
      try {
        // Get additional data needed for notifications
        const property = await storage.getProperty(updatedAppointment.propertyId);
        const agent = await storage.getUser(updatedAppointment.agentId);
        
        const notificationData = {
          appointment: updatedAppointment,
          clientEmail: updatedAppointment.clientEmail,
          clientPhone: updatedAppointment.clientPhone,
          agentName: agent ? `${agent.firstName || ''} ${agent.lastName || ''}`.trim() : 'Corretor',
          propertyAddress: property?.address || ''
        };

        // Check if status changed to confirmed
        if (originalAppointment.status !== 'confirmed' && updatedAppointment.status === 'confirmed') {
          await notificationService.sendConfirmationNotifications(notificationData);
        }
        // Check if appointment was rescheduled (date changed)
        else if (originalAppointment.appointmentDate !== updatedAppointment.appointmentDate) {
          await notificationService.sendRescheduleNotifications(
            notificationData, 
            typeof originalAppointment.appointmentDate === 'string' 
              ? originalAppointment.appointmentDate 
              : originalAppointment.appointmentDate.toISOString()
          );
        }
        // Check if status changed to cancelled
        else if (originalAppointment.status !== 'cancelled' && updatedAppointment.status === 'cancelled') {
          await notificationService.sendCancellationNotifications(notificationData);
        }

        console.log(`Notifications sent for appointment ${id} update`);
      } catch (notificationError) {
        console.error("Failed to send notifications:", notificationError);
        // Don't fail the request if notifications fail
      }
      
      res.json(updatedAppointment);
    } catch (error) {
      console.error("Error updating appointment:", error);
      res.status(500).json({ message: "Failed to update appointment" });
    }
  });

  // Delete appointment
  app.delete("/api/appointments/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      
      const appointment = await storage.getAppointment(id);
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      
      // Only the agent can delete appointment
      if (appointment.agentId !== userId) {
        return res.status(403).json({ message: "Not authorized to delete this appointment" });
      }
      
      await storage.deleteAppointment(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting appointment:", error);
      res.status(500).json({ message: "Failed to delete appointment" });
    }
  });

  // Send appointment reminders (can be called by a cron job or manually)
  app.post("/api/appointments/send-reminders", async (req, res) => {
    try {
      // Get appointments for tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const dayAfterTomorrow = new Date(tomorrow);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
      
      const upcomingAppointments = await storage.getAppointmentsByDateRange(
        tomorrow.toISOString(),
        dayAfterTomorrow.toISOString()
      );
      
      let remindersSent = 0;
      let failedReminders = 0;
      
      for (const appointment of upcomingAppointments) {
        try {
          // Skip if cancelled or completed
          if (['cancelled', 'completed', 'no_show'].includes(appointment.status)) {
            continue;
          }
          
          // Get property and agent details
          const property = await storage.getProperty(appointment.propertyId);
          const agent = await storage.getUser(appointment.agentId);
          
          const propertyTitle = property?.title || "Propriedade";
          const propertyAddress = property?.address || "";
          const agentName = agent ? `${agent.firstName || ''} ${agent.lastName || ''}`.trim() : "";
          
          const emailData = generateAppointmentReminderEmail({
            clientName: appointment.clientName,
            propertyTitle,
            appointmentDate: appointment.appointmentDate.toISOString(),
            propertyAddress,
            agentName,
            agentPhone: "", // Could be added to agent profile
          });

          const emailSent = await sendEmail({
            to: appointment.clientEmail,
            from: "noreply@premierproperties.com",
            subject: emailData.subject,
            html: emailData.html,
            text: emailData.text,
          });

          if (emailSent) {
            remindersSent++;
            console.log(`Reminder sent to ${appointment.clientEmail} for appointment ${appointment.id}`);
          } else {
            failedReminders++;
          }
        } catch (error) {
          console.error(`Failed to send reminder for appointment ${appointment.id}:`, error);
          failedReminders++;
        }
      }
      
      res.json({
        message: "Reminder processing completed",
        remindersSent,
        failedReminders,
        totalProcessed: upcomingAppointments.length
      });
      
    } catch (error) {
      console.error("Error processing appointment reminders:", error);
      res.status(500).json({ message: "Failed to process reminders" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
