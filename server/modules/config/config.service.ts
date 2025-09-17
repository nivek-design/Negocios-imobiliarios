import { config } from '../../core/config';
import { ServiceResult } from '../../core/types';

/**
 * CONFIG SERVICE
 * Business logic for configuration endpoints
 * Handles system configuration and public settings
 */

export class ConfigService {
  /**
   * Get Google Maps configuration
   */
  async getMapsConfig(): Promise<ServiceResult<{ apiKey: string }>> {
    try {
      const result = {
        apiKey: config.googleMaps.apiKey || '',
      };

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      console.error("Config service getMapsConfig error:", error);
      return {
        success: false,
        error: 'Falha ao buscar configuração de mapas',
        statusCode: 500,
      };
    }
  }

  /**
   * Get public app configuration
   */
  async getPublicConfig(): Promise<ServiceResult<any>> {
    try {
      const result = {
        maps: {
          apiKey: config.googleMaps.apiKey || '',
        },
        app: {
          name: 'Premier Properties',
          version: '1.0.0',
          environment: config.nodeEnv,
        },
        features: {
          objectStorage: true,
          emailNotifications: !!config.sendGrid.apiKey,
          geocoding: !!config.googleMaps.apiKey,
        },
      };

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      console.error("Config service getPublicConfig error:", error);
      return {
        success: false,
        error: 'Falha ao buscar configuração pública',
        statusCode: 500,
      };
    }
  }
}