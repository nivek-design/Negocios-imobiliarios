import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validateBody } from '../../middlewares/validate';
import { requireAdmin, requireSuperAdmin } from '../../middlewares/rbac';
import { 
  loginSchema, 
  registerSchema, 
  createAdminUserSchema, 
  createAgentUserSchema,
  registerAgentSchema,
  registrationRejectionSchema
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
router.post('/register-agent', validateBody(registerAgentSchema), authController.registerAgent);
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

// Super Admin-only registration management routes
router.get('/admin/pending-registrations',
  requireSuperAdmin,
  authController.getPendingRegistrations
);

router.post('/admin/approve-registration/:id',
  requireSuperAdmin,
  authController.approveRegistration
);

router.post('/admin/reject-registration/:id',
  requireSuperAdmin,
  validateBody(registrationRejectionSchema),
  authController.rejectRegistration
);

export { router as authRoutes };