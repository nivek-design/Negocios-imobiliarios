/**
 * APPOINTMENTS MODULE EXPORTS
 * Central export point for the appointments module
 */

export { AppointmentsController } from './appointments.controller';
export { AppointmentsService } from './appointments.service';
export { 
  appointmentsRoutes, 
  agentAppointmentsRoutes, 
  propertyAppointmentsRoutes,
  agentAvailabilityRoutes 
} from './appointments.routes';
export * from './appointments.validators';
export * as AppointmentsTypes from './appointments.validators';