import { z } from 'zod';
import { commonValidations } from '../../middlewares/validate';

/**
 * INQUIRIES VALIDATION SCHEMAS
 * Zod schemas for inquiry endpoints validation
 */

// Create inquiry schema
export const createInquirySchema = z.object({
  propertyId: z.string().min(1, 'ID do imóvel é obrigatório'),
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  email: commonValidations.email,
  phone: z.string().min(1, 'Telefone é obrigatório').max(20, 'Telefone muito longo'),
  message: z.string().min(1, 'Mensagem é obrigatória').max(1000, 'Mensagem muito longa'),
});

export type CreateInquiryRequest = z.infer<typeof createInquirySchema>;