import { ObjectStorageService, ObjectNotFoundError } from '../../objectStorage';
import { ServiceResult } from '../../core/types';
import { Response } from 'express';

/**
 * OBJECTS SERVICE
 * Business logic for object storage operations
 * Handles file uploads, downloads, and ACL management
 */

export class ObjectsService {
  private objectStorage = new ObjectStorageService();

  /**
   * Get public object by file path
   */
  async getPublicObject(filePath: string, res: Response): Promise<void> {
    try {
      const file = await this.objectStorage.searchPublicObject(filePath);
      if (!file) {
        res.status(404).json({ error: "File not found" });
        return;
      }
      this.objectStorage.downloadObject(file, res);
    } catch (error) {
      console.error("Objects service getPublicObject error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * Get object by object path
   */
  async getObject(objectPath: string, res: Response): Promise<void> {
    try {
      const objectFile = await this.objectStorage.getObjectEntityFile(objectPath);
      this.objectStorage.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Objects service getObject error:", error);
      if (error instanceof ObjectNotFoundError) {
        res.sendStatus(404);
        return;
      }
      res.sendStatus(500);
    }
  }

  /**
   * Get upload URL for authenticated user
   */
  async getUploadUrl(): Promise<ServiceResult<{ uploadURL: string }>> {
    try {
      const uploadURL = await this.objectStorage.getObjectEntityUploadURL();
      return {
        success: true,
        data: { uploadURL },
      };
    } catch (error: any) {
      console.error("Objects service getUploadUrl error:", error);
      return {
        success: false,
        error: 'Falha ao gerar URL de upload',
        statusCode: 500,
      };
    }
  }

  /**
   * Set object ACL policy (for property images)
   */
  async setObjectAcl(imageURL: string, userId: string): Promise<ServiceResult<{ objectPath: string }>> {
    try {
      const objectPath = await this.objectStorage.trySetObjectEntityAclPolicy(
        imageURL,
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
      console.error("Objects service setObjectAcl error:", error);
      return {
        success: false,
        error: 'Falha ao definir permissões do objeto',
        statusCode: 500,
      };
    }
  }
}