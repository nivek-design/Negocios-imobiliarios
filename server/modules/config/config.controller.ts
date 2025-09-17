import { Response } from 'express';
import { ConfigService } from './config.service';
import { asyncHandler, sendSuccess } from '../../core/asyncHandler';
import { OptionalAuthRequest } from '../../core/types';

/**
 * CONFIG CONTROLLER
 * Handles HTTP requests for configuration endpoints
 * Delegates business logic to ConfigService
 */

export class ConfigController {
  private configService = new ConfigService();

  /**
   * GET /api/config/maps
   * Get Google Maps API key configuration
   */
  getMapsConfig = asyncHandler(async (req: OptionalAuthRequest, res: Response) => {
    const result = await this.configService.getMapsConfig();
    
    if (!result.success) {
      return res.status(result.statusCode || 500).json({
        success: false,
        message: result.error,
      });
    }

    sendSuccess(res, result.data);
  });

  /**
   * GET /api/config
   * Get public application configuration
   */
  getPublicConfig = asyncHandler(async (req: OptionalAuthRequest, res: Response) => {
    const result = await this.configService.getPublicConfig();
    
    if (!result.success) {
      return res.status(result.statusCode || 500).json({
        success: false,
        message: result.error,
      });
    }

    sendSuccess(res, result.data);
  });
}