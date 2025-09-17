/**
 * OBJECTS MODULE EXPORTS
 * Central export point for the objects module
 */

export { ObjectsController } from './objects.controller';
export { ObjectsService } from './objects.service';
export { 
  objectsRoutes, 
  publicObjectsRoutes, 
  protectedObjectsRoutes,
  propertyImagesRoutes 
} from './objects.routes';
export * from './objects.validators';
export * as ObjectsTypes from './objects.validators';