import { storage } from '../../storage';
import { geocodingService } from '../../geocoding';
import { ObjectStorageService } from '../../objectStorage';
import { 
  NotFoundError, 
  ErrorMessages,
  AuthorizationError 
} from '../../core/errors';
import { ServiceResult } from '../../core/types';
import { 
  CreatePropertyRequest,
  UpdatePropertyRequest, 
  PropertyFiltersRequest,
  GeocodePropertyRequest,
  SetPropertyImageRequest 
} from './properties.validators';

/**
 * PROPERTIES SERVICE
 * Business logic for property operations
 * Handles data validation, storage operations, and external service integration
 */

export class PropertiesService {
  private objectStorage = new ObjectStorageService();

  /**
   * Get properties with filters
   */
  async getProperties(filters: PropertyFiltersRequest): Promise<ServiceResult<any[]>> {
    try {
      const properties = await storage.getProperties(filters);
      return {
        success: true,
        data: properties,
      };
    } catch (error: any) {
      console.error("Properties service getProperties error:", error);
      return {
        success: false,
        error: 'Falha ao buscar imóveis',
        statusCode: 500,
      };
    }
  }

  /**
   * Get featured properties
   */
  async getFeaturedProperties(): Promise<ServiceResult<any[]>> {
    try {
      const properties = await storage.getFeaturedProperties();
      return {
        success: true,
        data: properties,
      };
    } catch (error: any) {
      console.error("Properties service getFeaturedProperties error:", error);
      return {
        success: false,
        error: 'Falha ao buscar imóveis em destaque',
        statusCode: 500,
      };
    }
  }

  /**
   * Get property by ID
   */
  async getProperty(id: string): Promise<ServiceResult<any>> {
    try {
      const property = await storage.getProperty(id);
      
      if (!property) {
        return {
          success: false,
          error: ErrorMessages.PROPERTY_NOT_FOUND,
          statusCode: 404,
        };
      }
      
      return {
        success: true,
        data: property,
      };
    } catch (error: any) {
      console.error("Properties service getProperty error:", error);
      return {
        success: false,
        error: 'Falha ao buscar imóvel',
        statusCode: 500,
      };
    }
  }

  /**
   * Create new property
   */
  async createProperty(data: CreatePropertyRequest, agentId: string): Promise<ServiceResult<any>> {
    try {
      const propertyData = {
        ...data,
        agentId,
        latitude: data.latitude ? data.latitude.toString() : undefined,
        longitude: data.longitude ? data.longitude.toString() : undefined,
      };
      
      const property = await storage.createProperty(propertyData);
      return {
        success: true,
        data: property,
      };
    } catch (error: any) {
      console.error("Properties service createProperty error:", error);
      return {
        success: false,
        error: 'Falha ao criar imóvel',
        statusCode: 500,
      };
    }
  }

  /**
   * Update property
   */
  async updateProperty(id: string, data: UpdatePropertyRequest, userId: string, userRole: string): Promise<ServiceResult<any>> {
    try {
      // Get existing property for ownership check
      const existingProperty = await storage.getProperty(id);
      
      if (!existingProperty) {
        return {
          success: false,
          error: ErrorMessages.PROPERTY_NOT_FOUND,
          statusCode: 404,
        };
      }
      
      // Check ownership (admin can update any property)
      if (userRole !== 'admin' && existingProperty.agentId !== userId) {
        return {
          success: false,
          error: ErrorMessages.PROPERTY_OWNERSHIP_REQUIRED,
          statusCode: 403,
        };
      }
      
      const updateData = {
        ...data,
        latitude: data.latitude ? data.latitude.toString() : undefined,
        longitude: data.longitude ? data.longitude.toString() : undefined,
      };
      
      const updatedProperty = await storage.updateProperty(id, updateData);
      return {
        success: true,
        data: updatedProperty,
      };
    } catch (error: any) {
      console.error("Properties service updateProperty error:", error);
      return {
        success: false,
        error: 'Falha ao atualizar imóvel',
        statusCode: 500,
      };
    }
  }

  /**
   * Delete property
   */
  async deleteProperty(id: string, userId: string, userRole: string): Promise<ServiceResult<{ message: string }>> {
    try {
      // Get existing property for ownership check
      const existingProperty = await storage.getProperty(id);
      
      if (!existingProperty) {
        return {
          success: false,
          error: ErrorMessages.PROPERTY_NOT_FOUND,
          statusCode: 404,
        };
      }
      
      // Check ownership (admin can delete any property)
      if (userRole !== 'admin' && existingProperty.agentId !== userId) {
        return {
          success: false,
          error: ErrorMessages.PROPERTY_OWNERSHIP_REQUIRED,
          statusCode: 403,
        };
      }
      
      await storage.deleteProperty(id);
      return {
        success: true,
        data: { message: 'Imóvel excluído com sucesso' },
      };
    } catch (error: any) {
      console.error("Properties service deleteProperty error:", error);
      return {
        success: false,
        error: 'Falha ao excluir imóvel',
        statusCode: 500,
      };
    }
  }

  /**
   * Get properties by agent
   */
  async getPropertiesByAgent(agentId: string): Promise<ServiceResult<any[]>> {
    try {
      const properties = await storage.getPropertiesByAgent(agentId);
      return {
        success: true,
        data: properties,
      };
    } catch (error: any) {
      console.error("Properties service getPropertiesByAgent error:", error);
      return {
        success: false,
        error: 'Falha ao buscar imóveis do corretor',
        statusCode: 500,
      };
    }
  }

  /**
   * Record property view
   */
  async recordPropertyView(propertyId: string, userId?: string, ipAddress?: string): Promise<ServiceResult<{ message: string }>> {
    try {
      await storage.createPropertyView({
        propertyId,
        userId,
        ipAddress,
      });
      
      return {
        success: true,
        data: { message: 'Visualização registrada' },
      };
    } catch (error: any) {
      console.error("Properties service recordPropertyView error:", error);
      return {
        success: false,
        error: 'Falha ao registrar visualização',
        statusCode: 500,
      };
    }
  }

  /**
   * Add property to favorites
   */
  async addToFavorites(propertyId: string, userId: string): Promise<ServiceResult<{ message: string }>> {
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

      // Check if already favorited
      const isAlreadyFavorited = await storage.isPropertyFavorited(propertyId, userId);
      if (isAlreadyFavorited) {
        return {
          success: false,
          error: 'Imóvel já está nos favoritos',
          statusCode: 409,
        };
      }

      await storage.createPropertyFavorite({
        propertyId,
        userId,
      });

      return {
        success: true,
        data: { message: 'Imóvel adicionado aos favoritos' },
      };
    } catch (error: any) {
      console.error("Properties service addToFavorites error:", error);
      return {
        success: false,
        error: 'Falha ao adicionar aos favoritos',
        statusCode: 500,
      };
    }
  }

  /**
   * Remove property from favorites
   */
  async removeFromFavorites(propertyId: string, userId: string): Promise<ServiceResult<{ message: string }>> {
    try {
      await storage.removePropertyFavorite(propertyId, userId);
      return {
        success: true,
        data: { message: 'Imóvel removido dos favoritos' },
      };
    } catch (error: any) {
      console.error("Properties service removeFromFavorites error:", error);
      return {
        success: false,
        error: 'Falha ao remover dos favoritos',
        statusCode: 500,
      };
    }
  }

  /**
   * Check if property is favorited by user
   */
  async isPropertyFavorited(propertyId: string, userId: string): Promise<ServiceResult<{ favorited: boolean }>> {
    try {
      const favorited = await storage.isPropertyFavorited(propertyId, userId);
      return {
        success: true,
        data: { favorited },
      };
    } catch (error: any) {
      console.error("Properties service isPropertyFavorited error:", error);
      return {
        success: false,
        error: 'Falha ao verificar favoritos',
        statusCode: 500,
      };
    }
  }

  /**
   * Get user's favorite properties
   */
  async getUserFavorites(userId: string): Promise<ServiceResult<any[]>> {
    try {
      // This would require a new storage method to get user favorites
      // For now, we'll implement a basic version
      // TODO: Implement getUserFavorites in storage
      
      return {
        success: true,
        data: [], // Placeholder
      };
    } catch (error: any) {
      console.error("Properties service getUserFavorites error:", error);
      return {
        success: false,
        error: 'Falha ao buscar favoritos',
        statusCode: 500,
      };
    }
  }

  /**
   * Geocode property address
   */
  async geocodeProperty(data: GeocodePropertyRequest): Promise<ServiceResult<{ latitude: number; longitude: number; address: string }>> {
    try {
      const result = await geocodingService.geocodeAddress(
        data.address, 
        data.city, 
        data.state, 
        data.zipCode || ''
      );
      
      if (!result) {
        return {
          success: false,
          error: 'Endereço não encontrado',
          statusCode: 404,
        };
      }
      
      // Include the original address in the response
      const fullAddress = `${data.address}, ${data.city}, ${data.state}${data.zipCode ? ', ' + data.zipCode : ''}`;
      
      return {
        success: true,
        data: {
          ...result,
          address: fullAddress,
        },
      };
    } catch (error: any) {
      console.error("Properties service geocodeProperty error:", error);
      return {
        success: false,
        error: 'Falha ao geocodificar endereço',
        statusCode: 500,
      };
    }
  }

  /**
   * Set property image with proper ACL
   */
  async setPropertyImage(data: SetPropertyImageRequest, userId: string): Promise<ServiceResult<{ objectPath: string }>> {
    try {
      const objectPath = await this.objectStorage.trySetObjectEntityAclPolicy(
        data.imageURL,
        {
          owner: userId,
          visibility: "public",
        },
      );

      return {
        success: true,
        data: { objectPath },
      };
    } catch (error: any) {
      console.error("Properties service setPropertyImage error:", error);
      return {
        success: false,
        error: 'Falha ao definir imagem do imóvel',
        statusCode: 500,
      };
    }
  }
}