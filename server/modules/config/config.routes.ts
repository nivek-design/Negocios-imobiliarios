import { Router } from 'express';
import { ConfigController } from './config.controller';

/**
 * CONFIG ROUTES
 * Defines configuration endpoints (all public)
 */

const router = Router();
const configController = new ConfigController();

// Public configuration routes
router.get('/', configController.getPublicConfig);
router.get('/maps', configController.getMapsConfig);

export { router as configRoutes };