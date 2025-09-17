import { storage } from '../../storage';
import { ServiceResult } from '../../core/types';

/**
 * METRICS SERVICE
 * Business logic for metrics and analytics operations
 * Handles agent performance metrics and property statistics
 */

export class MetricsService {
  /**
   * Get agent metrics (views, favorites, properties)
   */
  async getAgentMetrics(agentId: string): Promise<ServiceResult<any>> {
    try {
      // Get basic metrics from storage
      const metrics = await storage.getAgentMetrics(agentId);
      
      // Get agent's properties count
      const agentProperties = await storage.getPropertiesByAgent(agentId);
      const totalProperties = agentProperties.length;
      
      // Get agent's inquiries count
      const agentInquiries = await storage.getInquiriesByAgent(agentId);
      const totalInquiries = agentInquiries.length;
      
      // Get agent's appointments count
      const agentAppointments = await storage.getAppointmentsByAgent(agentId);
      const totalAppointments = agentAppointments.length;
      
      // Calculate averages and additional metrics
      const averageViewsPerProperty = totalProperties > 0 
        ? Math.round(metrics.totalViews / totalProperties) 
        : 0;
      
      const averageFavoritesPerProperty = totalProperties > 0 
        ? Math.round(metrics.totalFavorites / totalProperties) 
        : 0;

      const result = {
        totalViews: metrics.totalViews || 0,
        totalFavorites: metrics.totalFavorites || 0,
        totalProperties,
        totalInquiries,
        totalAppointments,
        averageViewsPerProperty,
        averageFavoritesPerProperty,
        // Additional calculated metrics
        engagementRate: totalProperties > 0 
          ? ((metrics.totalFavorites + totalInquiries) / totalProperties * 100).toFixed(1)
          : '0.0',
        conversionRate: metrics.totalViews > 0 
          ? ((totalInquiries + totalAppointments) / metrics.totalViews * 100).toFixed(1)
          : '0.0',
      };

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      console.error("Metrics service getAgentMetrics error:", error);
      return {
        success: false,
        error: 'Falha ao buscar métricas do agente',
        statusCode: 500,
      };
    }
  }

  /**
   * Get property metrics
   */
  async getPropertyMetrics(propertyId: string): Promise<ServiceResult<any>> {
    try {
      // Get property view count
      const totalViews = await storage.getPropertyViewsCount(propertyId);
      
      // Get property favorites count
      const totalFavorites = await storage.getPropertyFavoritesCount(propertyId);
      
      // Get property inquiries
      const inquiries = await storage.getInquiriesForProperty(propertyId);
      const totalInquiries = inquiries.length;
      
      // Get property appointments
      const appointments = await storage.getAppointmentsByProperty(propertyId);
      const totalAppointments = appointments.length;

      const result = {
        totalViews,
        totalFavorites,
        totalInquiries,
        totalAppointments,
        engagementRate: totalViews > 0 
          ? ((totalFavorites + totalInquiries) / totalViews * 100).toFixed(1)
          : '0.0',
        conversionRate: totalViews > 0 
          ? ((totalInquiries + totalAppointments) / totalViews * 100).toFixed(1)
          : '0.0',
      };

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      console.error("Metrics service getPropertyMetrics error:", error);
      return {
        success: false,
        error: 'Falha ao buscar métricas do imóvel',
        statusCode: 500,
      };
    }
  }

  /**
   * Get system-wide metrics (admin only)
   */
  async getSystemMetrics(): Promise<ServiceResult<any>> {
    try {
      // This would require aggregating metrics across all users/properties
      // For now, implement a basic version
      // TODO: Implement comprehensive system metrics
      
      const result = {
        totalUsers: 0,
        totalProperties: 0,
        totalViews: 0,
        totalInquiries: 0,
        totalAppointments: 0,
      };

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      console.error("Metrics service getSystemMetrics error:", error);
      return {
        success: false,
        error: 'Falha ao buscar métricas do sistema',
        statusCode: 500,
      };
    }
  }
}