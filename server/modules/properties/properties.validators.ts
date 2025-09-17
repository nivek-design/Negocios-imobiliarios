import { z } from 'zod';
import { commonParams, commonQuery, commonValidations } from '../../middlewares/validate';

/**
 * PROPERTIES VALIDATION SCHEMAS
 * Zod schemas for property endpoints validation
 */

// Property creation/update schema
export const createPropertySchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(255, 'Título muito longo'),
  description: z.string().optional(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Preço deve ser um valor válido'),
  propertyType: z.enum(['house', 'condo', 'townhouse', 'apartment'], {
    errorMap: () => ({ message: 'Tipo de imóvel inválido' })
  }),
  status: z.enum(['for_sale', 'for_rent', 'sold', 'rented'], {
    errorMap: () => ({ message: 'Status do imóvel inválido' })
  }),
  bedrooms: z.number().int().min(0, 'Número de quartos inválido'),
  bathrooms: z.number().int().min(0, 'Número de banheiros inválido'),
  squareFeet: z.number().int().min(1, 'Área deve ser maior que zero'),
  address: z.string().min(1, 'Endereço é obrigatório').max(255, 'Endereço muito longo'),
  city: z.string().min(1, 'Cidade é obrigatória').max(100, 'Cidade muito longo'),
  state: z.string().min(1, 'Estado é obrigatório').max(50, 'Estado muito longo'),
  zipCode: z.string().min(1, 'CEP é obrigatório').max(20, 'CEP muito longo'),
  // Property features (optional)
  hasGarage: z.boolean().optional().default(false),
  hasPool: z.boolean().optional().default(false),
  hasBalcony: z.boolean().optional().default(false),
  hasGarden: z.boolean().optional().default(false),
  hasAirConditioning: z.boolean().optional().default(false),
  hasFireplace: z.boolean().optional().default(false),
  hasPetsAllowed: z.boolean().optional().default(false),
  // Location coordinates (optional)
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  // Images
  imageUrls: z.array(z.string().url('URL de imagem inválida')).optional().default([]),
  // Agent ID will be set automatically from authenticated user
});

export type CreatePropertyRequest = z.infer<typeof createPropertySchema>;

// Property update schema (all fields optional except those that should never be undefined)
export const updatePropertySchema = createPropertySchema.partial().extend({
  // Some fields that if provided, cannot be empty
  title: z.string().min(1, 'Título não pode estar vazio').max(255, 'Título muito longo').optional(),
  address: z.string().min(1, 'Endereço não pode estar vazio').max(255, 'Endereço muito longo').optional(),
  city: z.string().min(1, 'Cidade não pode estar vazia').max(100, 'Cidade muito longo').optional(),
  state: z.string().min(1, 'Estado não pode estar vazio').max(50, 'Estado muito longo').optional(),
  zipCode: z.string().min(1, 'CEP não pode estar vazio').max(20, 'CEP muito longo').optional(),
});

export type UpdatePropertyRequest = z.infer<typeof updatePropertySchema>;

// Property search/filters schema
export const propertyFiltersSchema = z.object({
  search: z.string().optional(),
  keyword: z.string().optional(),
  propertyType: z.union([
    z.string(),
    z.array(z.string())
  ]).optional(),
  status: z.string().optional(),
  city: z.string().optional(),
  minPrice: z.string().transform(val => val ? parseInt(val) : undefined).optional(),
  maxPrice: z.string().transform(val => val ? parseInt(val) : undefined).optional(),
  bedrooms: z.string().transform(val => val && val !== 'any' ? parseInt(val) : undefined).optional(),
  bathrooms: z.string().transform(val => val && val !== 'any' ? parseInt(val) : undefined).optional(),
  // Location filters
  latitude: z.string().transform(val => val ? parseFloat(val) : undefined).optional(),
  longitude: z.string().transform(val => val ? parseFloat(val) : undefined).optional(),
  radius: z.string().transform(val => val && val !== 'any' ? parseInt(val) : undefined).optional(),
  // Property features
  hasGarage: z.string().transform(val => val === 'true' ? true : val === 'false' ? false : undefined).optional(),
  hasPool: z.string().transform(val => val === 'true' ? true : val === 'false' ? false : undefined).optional(),
  hasBalcony: z.string().transform(val => val === 'true' ? true : val === 'false' ? false : undefined).optional(),
  hasGarden: z.string().transform(val => val === 'true' ? true : val === 'false' ? false : undefined).optional(),
  hasAirConditioning: z.string().transform(val => val === 'true' ? true : val === 'false' ? false : undefined).optional(),
  hasFireplace: z.string().transform(val => val === 'true' ? true : val === 'false' ? false : undefined).optional(),
  hasPetsAllowed: z.string().transform(val => val === 'true' ? true : val === 'false' ? false : undefined).optional(),
  // Pagination and sorting
  sortBy: z.string().optional(),
  limit: z.string().transform(val => val ? parseInt(val) : undefined).optional(),
  offset: z.string().transform(val => val ? parseInt(val) : undefined).optional(),
});

export type PropertyFiltersRequest = z.infer<typeof propertyFiltersSchema>;

// Property view schema
export const recordPropertyViewSchema = z.object({
  // Optional - will be extracted from auth if available
  userId: z.string().optional(),
});

export type RecordPropertyViewRequest = z.infer<typeof recordPropertyViewSchema>;

// Property geocoding schema
export const geocodePropertySchema = z.object({
  address: z.string().min(1, 'Endereço é obrigatório'),
  city: z.string().min(1, 'Cidade é obrigatória'),
  state: z.string().min(1, 'Estado é obrigatório'),
  zipCode: z.string().optional(),
});

export type GeocodePropertyRequest = z.infer<typeof geocodePropertySchema>;

// Property image URL schema
export const setPropertyImageSchema = z.object({
  imageURL: z.string().url('URL de imagem inválida'),
});

export type SetPropertyImageRequest = z.infer<typeof setPropertyImageSchema>;