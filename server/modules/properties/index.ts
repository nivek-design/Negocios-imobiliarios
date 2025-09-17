/**
 * PROPERTIES MODULE EXPORTS
 * Central export point for the properties module
 */

export { PropertiesController } from './properties.controller';
export { PropertiesService } from './properties.service';
export { 
  propertiesRoutes, 
  agentPropertiesRoutes, 
  userPropertiesRoutes, 
  propertyImagesRoutes 
} from './properties.routes';
export * from './properties.validators';
export * as PropertiesTypes from './properties.validators';