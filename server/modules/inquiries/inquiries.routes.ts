import { Router } from 'express';
import { InquiriesController } from './inquiries.controller';
import { validateBody, validateParams, commonParams } from '../../middlewares/validate';
import { requireAuth } from '../../middlewares/auth';
import { createInquirySchema } from './inquiries.validators';

/**
 * INQUIRIES ROUTES
 * Defines inquiry endpoints with validation and authorization
 */

const router = Router();
const inquiriesController = new InquiriesController();

// Public inquiry creation
router.post('/', 
  validateBody(createInquirySchema), 
  inquiriesController.createInquiry
);

// Agent-specific routes (mounted at different path in main router)
export const agentInquiriesRoutes = Router();
agentInquiriesRoutes.get('/', 
  requireAuth, 
  inquiriesController.getAgentInquiries
);

// Property-specific inquiries route (mounted at different path in main router)
export const propertyInquiriesRoutes = Router();
propertyInquiriesRoutes.get('/:id/inquiries', 
  validateParams(commonParams.id),
  requireAuth, 
  inquiriesController.getPropertyInquiries
);

export { router as inquiriesRoutes };