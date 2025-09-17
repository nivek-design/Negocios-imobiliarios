import { Response } from 'express';
import { AppointmentsService } from './appointments.service';
import { asyncHandler, sendSuccess, sendCreated } from '../../core/asyncHandler';
import { AuthenticatedRequest } from '../../core/types';
import { 
  CreateAppointmentRequest,
  UpdateAppointmentRequest 
} from './appointments.validators';

/**
 * APPOINTMENTS CONTROLLER
 * Handles HTTP requests for appointment endpoints
 * Delegates business logic to AppointmentsService
 */

export class AppointmentsController {
  private appointmentsService = new AppointmentsService();

  /**
   * POST /api/appointments
   * Create new appointment (public endpoint)
   */
  createAppointment = asyncHandler(async (req: OptionalAuthRequest, res: Response) => {
    const data: CreateAppointmentRequest = req.body;
    
    const result = await this.appointmentsService.createAppointment(data);
    
    if (!result.success) {
      return res.status(result.statusCode || 500).json({
        success: false,
        message: result.error,
      });
    }

    sendCreated(res, result.data);
  });

  /**
   * GET /api/agent/appointments
   * Get appointments for the authenticated agent
   */
  getAgentAppointments = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const agentId = authReq.user.id;
    
    const result = await this.appointmentsService.getAppointmentsByAgent(agentId);
    
    if (!result.success) {
      return res.status(result.statusCode || 500).json({
        success: false,
        message: result.error,
      });
    }

    sendSuccess(res, result.data);
  });

  /**
   * GET /api/properties/:propertyId/appointments
   * Get appointments for a specific property (agent/admin only)
   */
  getPropertyAppointments = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { propertyId } = authReq.params;
    const userId = authReq.user.id;
    const userRole = authReq.user.role;
    
    const result = await this.appointmentsService.getAppointmentsByProperty(propertyId, userId, userRole);
    
    if (!result.success) {
      return res.status(result.statusCode || 500).json({
        success: false,
        message: result.error,
      });
    }

    sendSuccess(res, result.data);
  });

  /**
   * GET /api/agents/:agentId/available-slots
   * Get available time slots for agent on specific date (public endpoint)
   */
  getAgentAvailableSlots = asyncHandler(async (req: OptionalAuthRequest, res: Response) => {
    const { agentId } = req.params;
    const { date } = req.query;
    
    const result = await this.appointmentsService.getAgentAvailableSlots(agentId, date as string);
    
    if (!result.success) {
      return res.status(result.statusCode || 500).json({
        success: false,
        message: result.error,
      });
    }

    sendSuccess(res, result.data);
  });

  /**
   * PUT /api/appointments/:id
   * Update appointment (authenticated users only)
   */
  updateAppointment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { id } = authReq.params;
    const data: UpdateAppointmentRequest = authReq.body;
    const userId = authReq.user.id;
    const userRole = authReq.user.role;
    
    const result = await this.appointmentsService.updateAppointment(id, data, userId, userRole);
    
    if (!result.success) {
      return res.status(result.statusCode || 500).json({
        success: false,
        message: result.error,
      });
    }

    sendSuccess(res, result.data);
  });

  /**
   * DELETE /api/appointments/:id
   * Delete appointment (authenticated users only)
   */
  deleteAppointment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { id } = authReq.params;
    const userId = authReq.user.id;
    const userRole = authReq.user.role;
    
    const result = await this.appointmentsService.deleteAppointment(id, userId, userRole);
    
    if (!result.success) {
      return res.status(result.statusCode || 500).json({
        success: false,
        message: result.error,
      });
    }

    sendSuccess(res, result.data);
  });

  /**
   * POST /api/appointments/send-reminders
   * Send appointment reminders (public endpoint for cron jobs)
   */
  sendAppointmentReminders = asyncHandler(async (req: OptionalAuthRequest, res: Response) => {
    const result = await this.appointmentsService.sendAppointmentReminders();
    
    if (!result.success) {
      return res.status(result.statusCode || 500).json({
        success: false,
        message: result.error,
      });
    }

    sendSuccess(res, result.data);
  });
}