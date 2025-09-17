import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validateBody } from '../../middlewares/validate';
import { requireAdmin } from '../../middlewares/rbac';
import { 
  loginSchema, 
  registerSchema, 
  createAdminUserSchema, 
  createAgentUserSchema 
} from './auth.validators';

/**
 * AUTH ROUTES
 * Defines authentication endpoints with validation and authorization
 */

const router = Router();
const authController = new AuthController();

// Public authentication routes
router.post('/login', validateBody(loginSchema), authController.login);
router.post('/register', validateBody(registerSchema), authController.register);
router.post('/logout', authController.logout);
router.get('/user', authController.getUser);

// Admin-only user creation routes  
router.post('/admin/create-user', 
  requireAdmin, 
  validateBody(createAdminUserSchema), 
  authController.createAdminUser
);

router.post('/admin/create-agent', 
  requireAdmin, 
  validateBody(createAgentUserSchema), 
  authController.createAgentUser
);

export { router as authRoutes };