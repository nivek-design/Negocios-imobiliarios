import { Router } from 'express';
import { PropertiesController } from './properties.controller';
import { validateBody, validateQuery, validateParams, commonParams } from '../../middlewares/validate';
import { requireAuth, optionalAuth } from '../../middlewares/auth';
import { requireAgent } from '../../middlewares/rbac';
import { requirePropertyOwnership } from '../../middlewares/ownership';
import { 
  createPropertySchema,
  updatePropertySchema, 
  propertyFiltersSchema,
  geocodePropertySchema,
  setPropertyImageSchema
} from './properties.validators';

/**
 * PROPERTIES ROUTES
 * Defines property endpoints with validation and authorization
 */

const router = Router();
const propertiesController = new PropertiesController();

// Public property routes
router.get('/', 
  validateQuery(propertyFiltersSchema), 
  propertiesController.getProperties
);

router.get('/featured', 
  propertiesController.getFeaturedProperties
);

router.get('/:id', 
  validateParams(commonParams.id), 
  propertiesController.getProperty
);

// Property view tracking (optional authentication)
router.post('/:id/view', 
  validateParams(commonParams.id),
  optionalAuth, 
  propertiesController.recordPropertyView
);

// Authenticated property routes
router.post('/:id/favorite', 
  validateParams(commonParams.id),
  requireAuth, 
  propertiesController.addToFavorites
);

router.delete('/:id/favorite', 
  validateParams(commonParams.id),
  requireAuth, 
  propertiesController.removeFromFavorites
);

router.get('/:id/is-favorited', 
  validateParams(commonParams.id),
  requireAuth, 
  propertiesController.isPropertyFavorited
);

router.post('/:id/geocode', 
  validateParams(commonParams.id),
  validateBody(geocodePropertySchema),
  requireAuth, 
  propertiesController.geocodeProperty
);

// Agent/Admin property management routes
router.post('/', 
  validateBody(createPropertySchema),
  requireAgent, 
  propertiesController.createProperty
);

router.put('/:id', 
  validateParams(commonParams.id),
  validateBody(updatePropertySchema),
  requireAgent,
  requirePropertyOwnership, 
  propertiesController.updateProperty
);

router.delete('/:id', 
  validateParams(commonParams.id),
  requireAgent,
  requirePropertyOwnership, 
  propertiesController.deleteProperty
);

// Agent-specific routes (mounted at different path in main router)
export const agentPropertiesRoutes = Router();
agentPropertiesRoutes.get('/', 
  requireAuth, 
  propertiesController.getAgentProperties
);

// User-specific routes (mounted at different path in main router)
export const userPropertiesRoutes = Router();
userPropertiesRoutes.get('/favorites', 
  requireAuth, 
  propertiesController.getUserFavorites
);

// Property images route (different path pattern)
export const propertyImagesRoutes = Router();
propertyImagesRoutes.put('/', 
  validateBody(setPropertyImageSchema),
  requireAuth, 
  propertiesController.setPropertyImage
);

export { router as propertiesRoutes };