import { Router } from 'express';
import { MetricsController } from './metrics.controller';
import { validateParams, commonParams } from '../../middlewares/validate';
import { requireAuth } from '../../middlewares/auth';
import { requireAdmin } from '../../middlewares/rbac';
import { cache, cachePresets } from '../../middlewares/cache';

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
  cache(cachePresets.metrics),
  metricsController.getAgentMetrics
);

// Property-specific metrics route (mounted at different path in main router)
export const propertyMetricsRoutes = Router();
propertyMetricsRoutes.get('/:id/metrics', 
  validateParams(commonParams.id),
  requireAuth, 
  cache(cachePresets.metrics),
  metricsController.getPropertyMetrics
);

// Admin-specific routes (mounted at different path in main router)
export const adminMetricsRoutes = Router();
adminMetricsRoutes.get('/', 
  requireAdmin, 
  cache(cachePresets.metrics),
  metricsController.getSystemMetrics
);

export { router as metricsRoutes };