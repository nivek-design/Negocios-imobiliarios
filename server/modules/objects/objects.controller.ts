import { Response } from 'express';
import { ObjectsService } from './objects.service';
import { asyncHandler, sendSuccess } from '../../core/asyncHandler';
import { AuthenticatedRequest, OptionalAuthRequest } from '../../core/types';

/**
 * OBJECTS CONTROLLER
 * Handles HTTP requests for object storage endpoints
 * Delegates business logic to ObjectsService
 */

export class ObjectsController {
  private objectsService = new ObjectsService();

  /**
   * GET /public-objects/:filePath(*)
   * Download public object by file path
   */
  getPublicObject = asyncHandler(async (req: OptionalAuthRequest, res: Response) => {
    const filePath = req.params.filePath;
    await this.objectsService.getPublicObject(filePath, res);
  });

  /**
   * GET /objects/:objectPath(*)
   * Download object by object path (with ACL check)
   */
  getObject = asyncHandler(async (req: OptionalAuthRequest, res: Response) => {
    const objectPath = req.path;
    await this.objectsService.getObject(objectPath, res);
  });

  /**
   * POST /api/objects/upload
   * Get upload URL for authenticated user
   */
  getUploadUrl = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const result = await this.objectsService.getUploadUrl();
    
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
   * Set property image ACL (handled by properties module, kept for compatibility)
   */
  setPropertyImageAcl = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { imageURL } = authReq.body;
    
    if (!imageURL) {
      return res.status(400).json({ error: "imageURL is required" });
    }

    const userId = authReq.user.id;
    const result = await this.objectsService.setObjectAcl(imageURL, userId);
    
    if (!result.success) {
      return res.status(result.statusCode || 500).json({
        success: false,
        message: result.error,
      });
    }

    sendSuccess(res, result.data);
  });
}