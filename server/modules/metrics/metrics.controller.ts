import { Response } from 'express';
import { MetricsService } from './metrics.service';
import { asyncHandler, sendSuccess } from '../../core/asyncHandler';
import { AuthenticatedRequest } from '../../core/types';

/**
 * METRICS CONTROLLER
 * Handles HTTP requests for metrics endpoints
 * Delegates business logic to MetricsService
 */

export class MetricsController {
  private metricsService = new MetricsService();

  /**
   * GET /api/agent/metrics
   * Get metrics for the authenticated agent
   */
  getAgentMetrics = asyncHandler(async (req: any, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const agentId = authReq.user.id;
    
    const result = await this.metricsService.getAgentMetrics(agentId);
    
    if (!result.success) {
      return res.status(result.statusCode || 500).json({
        success: false,
        message: result.error,
      });
    }

    sendSuccess(res, result.data);
  });

  /**
   * GET /api/properties/:id/metrics
   * Get metrics for a specific property (agent/admin only)
   */
  getPropertyMetrics = asyncHandler(async (req: any, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { id: propertyId } = authReq.params;
    
    const result = await this.metricsService.getPropertyMetrics(propertyId);
    
    if (!result.success) {
      return res.status(result.statusCode || 500).json({
        success: false,
        message: result.error,
      });
    }

    sendSuccess(res, result.data);
  });

  /**
   * GET /api/admin/metrics
   * Get system-wide metrics (admin only)
   */
  getSystemMetrics = asyncHandler(async (req: any, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const result = await this.metricsService.getSystemMetrics();
    
    if (!result.success) {
      return res.status(result.statusCode || 500).json({
        success: false,
        message: result.error,
      });
    }

    sendSuccess(res, result.data);
  });
}