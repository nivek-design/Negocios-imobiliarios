import { z } from 'zod';
import { commonValidations } from '../../middlewares/validate';

/**
 * APPOINTMENTS VALIDATION SCHEMAS
 * Zod schemas for appointment endpoints validation
 */

// Create appointment schema
export const createAppointmentSchema = z.object({
  propertyId: z.string().min(1, 'ID do imóvel é obrigatório'),
  agentId: z.string().min(1, 'ID do corretor é obrigatório'),
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  email: commonValidations.email,
  phone: z.string().min(1, 'Telefone é obrigatório').max(20, 'Telefone muito longo'),
  appointmentDate: z.string().refine(date => {
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime()) && parsedDate > new Date();
  }, 'Data do agendamento deve ser válida e futura'),
  appointmentTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Horário deve estar no formato HH:MM'),
  message: z.string().max(500, 'Mensagem muito longa').optional(),
});

export type CreateAppointmentRequest = z.infer<typeof createAppointmentSchema>;

// Update appointment schema
export const updateAppointmentSchema = z.object({
  appointmentDate: z.string().refine(date => {
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime()) && parsedDate > new Date();
  }, 'Data do agendamento deve ser válida e futura').optional(),
  appointmentTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Horário deve estar no formato HH:MM').optional(),
  status: z.enum(['confirmed', 'cancelled', 'completed'], {
    errorMap: () => ({ message: 'Status inválido' })
  }).optional(),
  notes: z.string().max(1000, 'Notas muito longas').optional(),
});

export type UpdateAppointmentRequest = z.infer<typeof updateAppointmentSchema>;

// Available slots query schema
export const availableSlotsQuerySchema = z.object({
  date: z.string().refine(date => {
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime());
  }, 'Data deve ser válida'),
});

export type AvailableSlotsQuery = z.infer<typeof availableSlotsQuerySchema>;