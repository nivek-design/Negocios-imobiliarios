import { Router } from 'express';
import { ConfigController } from './config.controller';
import { cache, cachePresets } from '../../middlewares/cache';

/**
 * CONFIG ROUTES
 * Defines configuration endpoints (all public)
 */

const router = Router();
const configController = new ConfigController();

// Public configuration routes
router.get('/', 
  cache(cachePresets.config),
  configController.getPublicConfig
);
router.get('/maps', 
  cache(cachePresets.config),
  configController.getMapsConfig
);

export { router as configRoutes };