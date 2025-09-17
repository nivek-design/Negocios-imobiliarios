import { Response } from 'express';
import { PropertiesService } from './properties.service';
import { asyncHandler, sendSuccess, sendCreated, sendNoContent } from '../../core/asyncHandler';
import { AuthenticatedRequest, OptionalAuthRequest } from '../../core/types';
import { 
  CreatePropertyRequest,
  UpdatePropertyRequest, 
  PropertyFiltersRequest,
  GeocodePropertyRequest,
  SetPropertyImageRequest 
} from './properties.validators';

/**
 * PROPERTIES CONTROLLER
 * Handles HTTP requests for property endpoints
 * Delegates business logic to PropertiesService
 */

export class PropertiesController {
  private propertiesService = new PropertiesService();

  /**
   * GET /api/properties
   * Get properties with filters (public endpoint)
   */
  getProperties = asyncHandler(async (req: any, res: Response) => {
    const filters: PropertyFiltersRequest = req.query;
    
    const result = await this.propertiesService.getProperties(filters);
    
    if (!result.success) {
      return res.status(result.statusCode || 500).json({
        success: false,
        message: result.error,
      });
    }

    sendSuccess(res, result.data);
  });

  /**
   * GET /api/properties/featured
   * Get featured properties (public endpoint)
   */
  getFeaturedProperties = asyncHandler(async (req: any, res: Response) => {
    const result = await this.propertiesService.getFeaturedProperties();
    
    if (!result.success) {
      return res.status(result.statusCode || 500).json({
        success: false,
        message: result.error,
      });
    }

    sendSuccess(res, result.data);
  });

  /**
   * GET /api/properties/:id
   * Get property by ID (public endpoint)
   */
  getProperty = asyncHandler(async (req: any, res: Response) => {
    const { id } = req.params;
    
    const result = await this.propertiesService.getProperty(id);
    
    if (!result.success) {
      return res.status(result.statusCode || 500).json({
        success: false,
        message: result.error,
      });
    }

    sendSuccess(res, result.data);
  });

  /**
   * POST /api/properties
   * Create new property (agent/admin only)
   */
  createProperty = asyncHandler(async (req: any, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const data: CreatePropertyRequest = authReq.body;
    const agentId = authReq.user.id;
    
    const result = await this.propertiesService.createProperty(data, agentId);
    
    if (!result.success) {
      return res.status(result.statusCode || 500).json({
        success: false,
        message: result.error,
      });
    }

    sendCreated(res, result.data);
  });

  /**
   * PUT /api/properties/:id
   * Update property (agent/admin only, with ownership check)
   */
  updateProperty = asyncHandler(async (req: any, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { id } = authReq.params;
    const data: UpdatePropertyRequest = authReq.body;
    const userId = authReq.user.id;
    const userRole = authReq.user.role;
    
    const result = await this.propertiesService.updateProperty(id, data, userId, userRole);
    
    if (!result.success) {
      return res.status(result.statusCode || 500).json({
        success: false,
        message: result.error,
      });
    }

    sendSuccess(res, result.data);
  });

  /**
   * DELETE /api/properties/:id
   * Delete property (agent/admin only, with ownership check)
   */
  deleteProperty = asyncHandler(async (req: any, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { id } = authReq.params;
    const userId = authReq.user.id;
    const userRole = authReq.user.role;
    
    const result = await this.propertiesService.deleteProperty(id, userId, userRole);
    
    if (!result.success) {
      return res.status(result.statusCode || 500).json({
        success: false,
        message: result.error,
      });
    }

    sendSuccess(res, result.data);
  });

  /**
   * GET /api/agent/properties
   * Get properties for the authenticated agent
   */
  getAgentProperties = asyncHandler(async (req: any, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const agentId = authReq.user.id;
    
    const result = await this.propertiesService.getPropertiesByAgent(agentId);
    
    if (!result.success) {
      return res.status(result.statusCode || 500).json({
        success: false,
        message: result.error,
      });
    }

    sendSuccess(res, result.data);
  });

  /**
   * POST /api/properties/:id/view
   * Record property view (optional authentication)
   */
  recordPropertyView = asyncHandler(async (req: any, res: Response) => {
    const optAuthReq = req as OptionalAuthRequest;
    const { id: propertyId } = optAuthReq.params;
    const userId = optAuthReq.user?.id;
    const ipAddress = optAuthReq.ip || optAuthReq.connection?.remoteAddress || undefined;
    
    const result = await this.propertiesService.recordPropertyView(propertyId, userId, ipAddress);
    
    if (!result.success) {
      return res.status(result.statusCode || 500).json({
        success: false,
        message: result.error,
      });
    }

    sendSuccess(res, result.data);
  });

  /**
   * POST /api/properties/:id/favorite
   * Add property to favorites (authenticated users only)
   */
  addToFavorites = asyncHandler(async (req: any, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { id: propertyId } = authReq.params;
    const userId = authReq.user.id;
    
    const result = await this.propertiesService.addToFavorites(propertyId, userId);
    
    if (!result.success) {
      return res.status(result.statusCode || 500).json({
        success: false,
        message: result.error,
      });
    }

    sendSuccess(res, result.data);
  });

  /**
   * DELETE /api/properties/:id/favorite
   * Remove property from favorites (authenticated users only)
   */
  removeFromFavorites = asyncHandler(async (req: any, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { id: propertyId } = authReq.params;
    const userId = authReq.user.id;
    
    const result = await this.propertiesService.removeFromFavorites(propertyId, userId);
    
    if (!result.success) {
      return res.status(result.statusCode || 500).json({
        success: false,
        message: result.error,
      });
    }

    sendSuccess(res, result.data);
  });

  /**
   * GET /api/properties/:id/is-favorited
   * Check if property is favorited by user (authenticated users only)
   */
  isPropertyFavorited = asyncHandler(async (req: any, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { id: propertyId } = authReq.params;
    const userId = authReq.user.id;
    
    const result = await this.propertiesService.isPropertyFavorited(propertyId, userId);
    
    if (!result.success) {
      return res.status(result.statusCode || 500).json({
        success: false,
        message: result.error,
      });
    }

    sendSuccess(res, result.data);
  });

  /**
   * GET /api/user/favorites
   * Get user's favorite properties (authenticated users only)
   */
  getUserFavorites = asyncHandler(async (req: any, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.id;
    
    const result = await this.propertiesService.getUserFavorites(userId);
    
    if (!result.success) {
      return res.status(result.statusCode || 500).json({
        success: false,
        message: result.error,
      });
    }

    sendSuccess(res, result.data);
  });

  /**
   * POST /api/properties/:id/geocode
   * Geocode property address (authenticated users only)
   */
  geocodeProperty = asyncHandler(async (req: any, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const data: GeocodePropertyRequest = authReq.body;
    
    const result = await this.propertiesService.geocodeProperty(data);
    
    if (!result.success) {
      return res.status(result.statusCode || 500).json({
        success: false,
        message: result.error,
      });
    }

    sendSuccess(res, result.data);
  });

  /**
   * PUT /api/property-images
   * Set property image with proper ACL (authenticated users only)
   */
  setPropertyImage = asyncHandler(async (req: any, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const data: SetPropertyImageRequest = authReq.body;
    const userId = authReq.user.id;
    
    const result = await this.propertiesService.setPropertyImage(data, userId);
    
    if (!result.success) {
      return res.status(result.statusCode || 500).json({
        success: false,
        message: result.error,
      });
    }

    sendSuccess(res, result.data);
  });
}