import { Router } from 'express';
import { MetricsController } from './metrics.controller';
import { validateParams, commonParams } from '../../middlewares/validate';
import { requireAuth } from '../../middlewares/auth';
import { requireAdmin } from '../../middlewares/rbac';

/**
 * METRICS ROUTES
 * Defines metrics endpoints with validation and authorization
 */

const router = Router();
const metricsController = new MetricsController();

// Agent-specific routes (mounted at different path in main router)
export const agentMetricsRoutes = Router();
agentMetricsRoutes.get('/', 
  requireAuth, 
  metricsController.getAgentMetrics
);

// Property-specific metrics route (mounted at different path in main router)
export const propertyMetricsRoutes = Router();
propertyMetricsRoutes.get('/:id/metrics', 
  validateParams(commonParams.id),
  requireAuth, 
  metricsController.getPropertyMetrics
);

// Admin-specific routes (mounted at different path in main router)
export const adminMetricsRoutes = Router();
adminMetricsRoutes.get('/', 
  requireAdmin, 
  metricsController.getSystemMetrics
);

export { router as metricsRoutes };