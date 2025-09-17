import { Response } from 'express';
import { InquiriesService } from './inquiries.service';
import { asyncHandler, sendSuccess, sendCreated } from '../../core/asyncHandler';
import { AuthenticatedRequest } from '../../core/types';
import { CreateInquiryRequest } from './inquiries.validators';

/**
 * INQUIRIES CONTROLLER
 * Handles HTTP requests for inquiry endpoints
 * Delegates business logic to InquiriesService
 */

export class InquiriesController {
  private inquiriesService = new InquiriesService();

  /**
   * POST /api/inquiries
   * Create new inquiry (public endpoint)
   */
  createInquiry = asyncHandler(async (req: any, res: Response) => {
    const data: CreateInquiryRequest = req.body;
    
    const result = await this.inquiriesService.createInquiry(data);
    
    if (!result.success) {
      return res.status(result.statusCode || 500).json({
        success: false,
        message: result.error,
      });
    }

    sendCreated(res, result.data);
  });

  /**
   * GET /api/agent/inquiries
   * Get inquiries for the authenticated agent
   */
  getAgentInquiries = asyncHandler(async (req: any, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const agentId = authReq.user.id;
    
    const result = await this.inquiriesService.getInquiriesByAgent(agentId);
    
    if (!result.success) {
      return res.status(result.statusCode || 500).json({
        success: false,
        message: result.error,
      });
    }

    sendSuccess(res, result.data);
  });

  /**
   * GET /api/properties/:id/inquiries
   * Get inquiries for a specific property (agent/admin only)
   */
  getPropertyInquiries = asyncHandler(async (req: any, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { id: propertyId } = authReq.params;
    const userId = authReq.user.id;
    const userRole = authReq.user.role;
    
    const result = await this.inquiriesService.getInquiriesForProperty(propertyId, userId, userRole);
    
    if (!result.success) {
      return res.status(result.statusCode || 500).json({
        success: false,
        message: result.error,
      });
    }

    sendSuccess(res, result.data);
  });
}