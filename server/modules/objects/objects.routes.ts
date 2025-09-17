import { Router } from 'express';
import { ObjectsController } from './objects.controller';
import { validateBody } from '../../middlewares/validate';
import { requireAuth } from '../../middlewares/auth';
import { setPropertyImageAclSchema } from './objects.validators';

/**
 * OBJECTS ROUTES
 * Defines object storage endpoints with validation and authorization
 */

const router = Router();
const objectsController = new ObjectsController();

// Public object access routes (mounted at different paths in main router)
export const publicObjectsRoutes = Router();
publicObjectsRoutes.get('/:filePath(*)', objectsController.getPublicObject);

export const protectedObjectsRoutes = Router();
protectedObjectsRoutes.get('/:objectPath(*)', objectsController.getObject);

// API routes for object management
router.post('/upload', 
  requireAuth, 
  objectsController.getUploadUrl
);

// Property images ACL route (kept for compatibility)
export const propertyImagesRoutes = Router();
propertyImagesRoutes.put('/', 
  validateBody(setPropertyImageAclSchema),
  requireAuth, 
  objectsController.setPropertyImageAcl
);

export { router as objectsRoutes };