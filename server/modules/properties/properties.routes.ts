import { Router } from 'express';
import { PropertiesController } from './properties.controller';
import { validateBody, validateQuery, validateParams, commonParams } from '../../middlewares/validate';
import { requireAuth, optionalAuth } from '../../middlewares/auth';
import { requireAgent } from '../../middlewares/rbac';
import { requirePropertyOwnership } from '../../middlewares/ownership';
import { cache, smartInvalidate, cachePresets } from '../../middlewares/cache';
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
  cache(cachePresets.propertyList),
  propertiesController.getProperties
);

router.get('/featured', 
  cache(cachePresets.featuredProperties),
  propertiesController.getFeaturedProperties
);

router.get('/:id', 
  validateParams(commonParams.id), 
  cache({ 
    ...cachePresets.property, 
    tags: ['property:detail'], 
    dynamicTags: [(req) => `property:${req.params.id}`] 
  }),
  propertiesController.getProperty
);

// Property view tracking (optional authentication)
router.post('/:id/view', 
  validateParams(commonParams.id),
  optionalAuth, 
  smartInvalidate({
    entityType: 'metrics',
    action: 'update'
  }),
  propertiesController.recordPropertyView
);

// Authenticated property routes
router.post('/:id/favorite', 
  validateParams(commonParams.id),
  requireAuth, 
  smartInvalidate({
    entityType: 'user',
    action: 'update',
    additionalTags: ['metrics']
  }),
  propertiesController.addToFavorites
);

router.delete('/:id/favorite', 
  validateParams(commonParams.id),
  requireAuth, 
  smartInvalidate({
    entityType: 'user',
    action: 'update',
    additionalTags: ['metrics']
  }),
  propertiesController.removeFromFavorites
);

router.get('/:id/is-favorited', 
  validateParams(commonParams.id),
  requireAuth, 
  cache(cachePresets.userSpecific),
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
  smartInvalidate({
    entityType: 'property',
    action: 'create',
    additionalTags: ['property:featured']
  }),
  propertiesController.createProperty
);

router.put('/:id', 
  validateParams(commonParams.id),
  validateBody(updatePropertySchema),
  requireAgent,
  requirePropertyOwnership, 
  smartInvalidate({
    entityType: 'property',
    action: 'update',
    entityId: (req) => req.params.id,
    additionalTags: ['property:featured']
  }),
  propertiesController.updateProperty
);

router.delete('/:id', 
  validateParams(commonParams.id),
  requireAgent,
  requirePropertyOwnership, 
  smartInvalidate({
    entityType: 'property',
    action: 'delete',
    entityId: (req) => req.params.id,
    additionalTags: ['property:featured']
  }),
  propertiesController.deleteProperty
);

// Agent-specific routes (mounted at different path in main router)
export const agentPropertiesRoutes = Router();
agentPropertiesRoutes.get('/', 
  requireAuth, 
  cache(cachePresets.userSpecific),
  propertiesController.getAgentProperties
);

// User-specific routes (mounted at different path in main router)
export const userPropertiesRoutes = Router();
userPropertiesRoutes.get('/favorites', 
  requireAuth, 
  cache(cachePresets.userSpecific),
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