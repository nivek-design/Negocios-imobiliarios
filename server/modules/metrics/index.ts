/**
 * METRICS MODULE EXPORTS
 * Central export point for the metrics module
 */

export { MetricsController } from './metrics.controller';
export { MetricsService } from './metrics.service';
export { 
  metricsRoutes, 
  agentMetricsRoutes, 
  propertyMetricsRoutes,
  adminMetricsRoutes 
} from './metrics.routes';