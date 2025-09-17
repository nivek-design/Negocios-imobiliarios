import { Router } from 'express';
import { AppointmentsController } from './appointments.controller';
import { validateBody, validateParams, validateQuery, commonParams } from '../../middlewares/validate';
import { requireAuth } from '../../middlewares/auth';
import { 
  createAppointmentSchema,
  updateAppointmentSchema,
  availableSlotsQuerySchema 
} from './appointments.validators';

/**
 * APPOINTMENTS ROUTES
 * Defines appointment endpoints with validation and authorization
 */

const router = Router();
const appointmentsController = new AppointmentsController();

// Public appointment routes
router.post('/', 
  validateBody(createAppointmentSchema), 
  appointmentsController.createAppointment
);

router.post('/send-reminders', 
  appointmentsController.sendAppointmentReminders
);

// Authenticated appointment management
router.put('/:id', 
  validateParams(commonParams.id),
  validateBody(updateAppointmentSchema),
  requireAuth, 
  appointmentsController.updateAppointment
);

router.delete('/:id', 
  validateParams(commonParams.id),
  requireAuth, 
  appointmentsController.deleteAppointment
);

// Agent-specific routes (mounted at different path in main router)
export const agentAppointmentsRoutes = Router();
agentAppointmentsRoutes.get('/', 
  requireAuth, 
  appointmentsController.getAgentAppointments
);

// Property-specific appointments route (mounted at different path in main router)
export const propertyAppointmentsRoutes = Router();
propertyAppointmentsRoutes.get('/:propertyId/appointments', 
  validateParams(commonParams.propertyId),
  requireAuth, 
  appointmentsController.getPropertyAppointments
);

// Agent availability routes (mounted at different path in main router)
export const agentAvailabilityRoutes = Router();
agentAvailabilityRoutes.get('/:agentId/available-slots', 
  validateParams(commonParams.agentId),
  validateQuery(availableSlotsQuerySchema),
  appointmentsController.getAgentAvailableSlots
);

export { router as appointmentsRoutes };