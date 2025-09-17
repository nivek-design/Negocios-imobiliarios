import { z } from 'zod';

/**
 * OBJECTS VALIDATION SCHEMAS
 * Zod schemas for object storage endpoints validation
 */

// Set property image ACL schema
export const setPropertyImageAclSchema = z.object({
  imageURL: z.string().url('URL de imagem inválida'),
});

export type SetPropertyImageAclRequest = z.infer<typeof setPropertyImageAclSchema>;