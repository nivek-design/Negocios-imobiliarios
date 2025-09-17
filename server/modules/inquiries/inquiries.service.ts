import { storage } from '../../storage';
import { sendEmail, generateInquiryNotificationEmail } from '../../emailService';
import { notificationService } from '../../notificationService';
import { 
  NotFoundError, 
  ErrorMessages 
} from '../../core/errors';
import { ServiceResult } from '../../core/types';
import { CreateInquiryRequest } from './inquiries.validators';

/**
 * INQUIRIES SERVICE
 * Business logic for inquiry operations
 * Handles inquiry creation, notifications, and retrieval
 */

export class InquiriesService {
  /**
   * Create new inquiry
   */
  async createInquiry(data: CreateInquiryRequest): Promise<ServiceResult<any>> {
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

      // Create inquiry - map name to firstName/lastName if needed
      const inquiryData = {
        propertyId: data.propertyId,
        email: data.email,
        firstName: (data as any).firstName || (data as any).name || '',
        lastName: (data as any).lastName || '',
        phone: data.phone,
        message: data.message,
      };
      
      const inquiry = await storage.createInquiry(inquiryData);

      // Send notification to agent (async, don't wait)
      this.sendInquiryNotification(inquiry, property).catch(error => {
        console.error('Failed to send inquiry notification:', error);
      });

      return {
        success: true,
        data: {
          ...inquiry,
          message: 'Consulta enviada com sucesso',
        },
      };
    } catch (error: any) {
      console.error("Inquiries service createInquiry error:", error);
      return {
        success: false,
        error: 'Falha ao enviar consulta',
        statusCode: 500,
      };
    }
  }

  /**
   * Get inquiries for agent
   */
  async getInquiriesByAgent(agentId: string): Promise<ServiceResult<any[]>> {
    try {
      const inquiries = await storage.getInquiriesByAgent(agentId);
      return {
        success: true,
        data: inquiries,
      };
    } catch (error: any) {
      console.error("Inquiries service getInquiriesByAgent error:", error);
      return {
        success: false,
        error: 'Falha ao buscar consultas',
        statusCode: 500,
      };
    }
  }

  /**
   * Get inquiries for specific property
   */
  async getInquiriesForProperty(propertyId: string, userId: string, userRole: string): Promise<ServiceResult<any[]>> {
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

      // Check ownership (admin can see all, agent can only see their property inquiries)
      if (userRole !== 'admin' && property.agentId !== userId) {
        return {
          success: false,
          error: ErrorMessages.PROPERTY_OWNERSHIP_REQUIRED,
          statusCode: 403,
        };
      }

      const inquiries = await storage.getInquiriesForProperty(propertyId);
      return {
        success: true,
        data: inquiries,
      };
    } catch (error: any) {
      console.error("Inquiries service getInquiriesForProperty error:", error);
      return {
        success: false,
        error: 'Falha ao buscar consultas do imóvel',
        statusCode: 500,
      };
    }
  }

  /**
   * Send inquiry notification to agent (private method)
   */
  private async sendInquiryNotification(inquiry: any, property: any): Promise<void> {
    try {
      // Get agent information
      const agent = await storage.getUser(property.agentId);
      if (!agent) {
        console.warn(`Agent not found for property ${property.id}`);
        return;
      }

      // Generate email content
      const emailContent = generateInquiryNotificationEmail(inquiry, property);
      
      // Send email notification
      if (agent.email) {
        await sendEmail({
          to: agent.email,
          from: 'noreply@premierproperties.com',
          subject: emailContent.subject,
          html: emailContent.html,
        });
      }

      // TODO: Send in-app notification (sendNotification method needs to be implemented)
      // await notificationService.sendNotification({
      //   userId: agent.id,
      //   title: 'Nova Consulta de Imóvel',
      //   message: `${inquiry.firstName} ${inquiry.lastName} está interessado no imóvel ${property.title}`,
      //   type: 'inquiry',
      //   data: { inquiryId: inquiry.id, propertyId: property.id },
      // });

      console.log(`Inquiry notification sent for property ${property.id} to agent ${agent.id}`);
    } catch (error) {
      console.error('Error sending inquiry notification:', error);
      // Don't throw error - this is a background task
    }
  }
}