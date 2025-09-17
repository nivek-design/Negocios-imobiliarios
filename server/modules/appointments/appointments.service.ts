import { storage } from '../../storage';
import { sendEmail, generateAppointmentConfirmationEmail, generateAppointmentReminderEmail } from '../../emailService';
import { notificationService } from '../../notificationService';
import { 
  NotFoundError, 
  ErrorMessages,
  AuthorizationError 
} from '../../core/errors';
import { ServiceResult } from '../../core/types';
import { 
  CreateAppointmentRequest,
  UpdateAppointmentRequest 
} from './appointments.validators';

/**
 * APPOINTMENTS SERVICE
 * Business logic for appointment operations
 * Handles appointment creation, updates, notifications, and scheduling
 */

export class AppointmentsService {
  /**
   * Create new appointment
   */
  async createAppointment(data: CreateAppointmentRequest): Promise<ServiceResult<any>> {
    try {
      // Check if property exists
      const property = await storage.getProperty(data.propertyId);
      if (!property) {
        return {
          success: false,
          error: ErrorMessages.PROPERTY_NOT_FOUND,
          statusCode: 404,
        };
      }

      // Check if agent exists
      const agent = await storage.getUser(data.agentId);
      if (!agent || agent.role !== 'agent') {
        return {
          success: false,
          error: 'Corretor não encontrado',
          statusCode: 404,
        };
      }

      // Combine date and time into a single datetime
      const appointmentDateTime = new Date(`${data.appointmentDate} ${data.appointmentTime}`);
      
      // Create appointment
      const appointment = await storage.createAppointment({
        propertyId: data.propertyId,
        agentId: data.agentId,
        clientName: data.name,
        clientEmail: data.email,
        clientPhone: data.phone,
        appointmentDate: appointmentDateTime,
        notes: data.message,
        status: 'confirmed',
      });

      // Send confirmation notifications (async, don't wait)
      this.sendAppointmentNotifications(appointment, property, agent).catch(error => {
        console.error('Failed to send appointment notifications:', error);
      });

      return {
        success: true,
        data: {
          ...appointment,
          message: 'Agendamento criado com sucesso',
        },
      };
    } catch (error: any) {
      console.error("Appointments service createAppointment error:", error);
      return {
        success: false,
        error: 'Falha ao criar agendamento',
        statusCode: 500,
      };
    }
  }

  /**
   * Get appointments for agent
   */
  async getAppointmentsByAgent(agentId: string): Promise<ServiceResult<any[]>> {
    try {
      const result = await storage.getAppointmentsByAgent(agentId);
      // Extract data array from PaginatedResponse for backward compatibility
      const appointments = result.data || [];
      return {
        success: true,
        data: appointments,
        pagination: result.pagination, // Include pagination metadata
      };
    } catch (error: any) {
      console.error("Appointments service getAppointmentsByAgent error:", error);
      return {
        success: false,
        error: 'Falha ao buscar agendamentos',
        statusCode: 500,
      };
    }
  }

  /**
   * Get appointments for specific property
   */
  async getAppointmentsByProperty(propertyId: string, userId: string, userRole: string): Promise<ServiceResult<any[]>> {
    try {
      // Check if property exists
      const property = await storage.getProperty(propertyId);
      if (!property) {
        return {
          success: false,
          error: ErrorMessages.PROPERTY_NOT_FOUND,
          statusCode: 404,
        };
      }

      // Check ownership (admin can see all, agent can only see their property appointments)
      if (userRole !== 'admin' && property.agentId !== userId) {
        return {
          success: false,
          error: ErrorMessages.PROPERTY_OWNERSHIP_REQUIRED,
          statusCode: 403,
        };
      }

      const result = await storage.getAppointmentsByProperty(propertyId);
      // Extract data array from PaginatedResponse for backward compatibility
      const appointments = result.data || [];
      return {
        success: true,
        data: appointments,
        pagination: result.pagination, // Include pagination metadata
      };
    } catch (error: any) {
      console.error("Appointments service getAppointmentsByProperty error:", error);
      return {
        success: false,
        error: 'Falha ao buscar agendamentos do imóvel',
        statusCode: 500,
      };
    }
  }

  /**
   * Get available time slots for agent on specific date
   */
  async getAgentAvailableSlots(agentId: string, date: string): Promise<ServiceResult<string[]>> {
    try {
      // Check if agent exists
      const agent = await storage.getUser(agentId);
      if (!agent || agent.role !== 'agent') {
        return {
          success: false,
          error: 'Corretor não encontrado',
          statusCode: 404,
        };
      }

      const availableSlots = await storage.getAgentAvailableSlots(agentId, date);
      return {
        success: true,
        data: availableSlots,
      };
    } catch (error: any) {
      console.error("Appointments service getAgentAvailableSlots error:", error);
      return {
        success: false,
        error: 'Falha ao buscar horários disponíveis',
        statusCode: 500,
      };
    }
  }

  /**
   * Update appointment
   */
  async updateAppointment(id: string, data: UpdateAppointmentRequest, userId: string, userRole: string): Promise<ServiceResult<any>> {
    try {
      // Get existing appointment
      const existingAppointment = await storage.getAppointment(id);
      if (!existingAppointment) {
        return {
          success: false,
          error: ErrorMessages.APPOINTMENT_NOT_FOUND,
          statusCode: 404,
        };
      }

      // Check access (admin or agent who owns the appointment)
      const hasAccess = userRole === 'admin' || 
                       existingAppointment.agentId === userId;
      
      if (!hasAccess) {
        return {
          success: false,
          error: 'Acesso negado. Você só pode modificar seus próprios agendamentos.',
          statusCode: 403,
        };
      }

      // If updating date/time, combine them
      let updateData: any = { ...data };
      if (data.appointmentDate && data.appointmentTime) {
        updateData.appointmentDate = new Date(`${data.appointmentDate} ${data.appointmentTime}`);
        delete updateData.appointmentTime;
      }

      const updatedAppointment = await storage.updateAppointment(id, updateData);
      return {
        success: true,
        data: updatedAppointment,
      };
    } catch (error: any) {
      console.error("Appointments service updateAppointment error:", error);
      return {
        success: false,
        error: 'Falha ao atualizar agendamento',
        statusCode: 500,
      };
    }
  }

  /**
   * Delete appointment
   */
  async deleteAppointment(id: string, userId: string, userRole: string): Promise<ServiceResult<{ message: string }>> {
    try {
      // Get existing appointment
      const existingAppointment = await storage.getAppointment(id);
      if (!existingAppointment) {
        return {
          success: false,
          error: ErrorMessages.APPOINTMENT_NOT_FOUND,
          statusCode: 404,
        };
      }

      // Check access (admin or agent who owns the appointment)
      const hasAccess = userRole === 'admin' || 
                       existingAppointment.agentId === userId;
      
      if (!hasAccess) {
        return {
          success: false,
          error: 'Acesso negado. Você só pode excluir seus próprios agendamentos.',
          statusCode: 403,
        };
      }

      await storage.deleteAppointment(id);
      return {
        success: true,
        data: { message: 'Agendamento excluído com sucesso' },
      };
    } catch (error: any) {
      console.error("Appointments service deleteAppointment error:", error);
      return {
        success: false,
        error: 'Falha ao excluir agendamento',
        statusCode: 500,
      };
    }
  }

  /**
   * Send appointment reminders
   */
  async sendAppointmentReminders(): Promise<ServiceResult<{ message: string; sent: number }>> {
    try {
      // This would typically get appointments for the next day
      // For now, implement a basic version
      // TODO: Implement proper reminder logic
      
      return {
        success: true,
        data: {
          message: 'Lembretes enviados com sucesso',
          sent: 0,
        },
      };
    } catch (error: any) {
      console.error("Appointments service sendAppointmentReminders error:", error);
      return {
        success: false,
        error: 'Falha ao enviar lembretes',
        statusCode: 500,
      };
    }
  }

  /**
   * Send appointment confirmation notifications (private method)
   */
  private async sendAppointmentNotifications(appointment: any, property: any, agent: any): Promise<void> {
    try {
      // Generate confirmation email content
      const confirmationEmail = generateAppointmentConfirmationEmail({
        clientName: appointment.clientName,
        propertyTitle: property.title,
        appointmentDate: appointment.appointmentDate.toISOString(),
        propertyAddress: property.address,
        agentName: `${agent.firstName} ${agent.lastName}`,
        agentPhone: agent.phone
      });
      
      // Send confirmation to client
      await sendEmail({
        to: appointment.clientEmail,
        from: 'noreply@premierproperties.com',
        subject: confirmationEmail.subject,
        html: confirmationEmail.html,
      });

      // Send notification to agent
      if (agent.email) {
        const agentEmail = generateAppointmentConfirmationEmail({
          clientName: appointment.clientName,
          propertyTitle: property.title,
          appointmentDate: appointment.appointmentDate.toISOString(),
          propertyAddress: property.address,
          agentName: `${agent.firstName} ${agent.lastName}`,
          agentPhone: agent.phone
        });
        await sendEmail({
          to: agent.email,
          from: 'noreply@premierproperties.com',
          subject: agentEmail.subject,
          html: agentEmail.html,
        });
      }

      // TODO: Send in-app notification (sendNotification method needs to be implemented)
      // await notificationService.sendNotification({
      //   userId: agent.id,
      //   title: 'Novo Agendamento',
      //   message: `${appointment.clientName} agendou uma visita para ${property.title}`,
      //   type: 'appointment',
      //   data: { appointmentId: appointment.id, propertyId: property.id },
      // });

      console.log(`Appointment notifications sent for appointment ${appointment.id}`);
    } catch (error) {
      console.error('Error sending appointment notifications:', error);
      // Don't throw error - this is a background task
    }
  }
}