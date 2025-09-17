import { storage } from '../storage';
import { NotFoundError, AuthorizationError, ErrorMessages } from '../core/errors';
import { asyncHandler } from '../core/asyncHandler';
import { AuthenticatedRequest, UserRoles } from '../core/types';
import { requireAuth } from './auth';

/**
 * RESOURCE OWNERSHIP MIDDLEWARE
 * Ensures users can only access resources they own, unless they are admin
 */

/**
 * PROPERTY OWNERSHIP MIDDLEWARE
 * Ensures agents can only access their own properties, admins can access all
 * Attaches the property to req.property for use in controllers
 */
export const requirePropertyOwnership = asyncHandler(async (req: any, res: any, next) => {
  // First ensure user is authenticated
  await new Promise<void>((resolve, reject) => {
    requireAuth(req, res, (err?: any) => {
      if (err) reject(err);
      else resolve();
    });
  });

  const user = (req as AuthenticatedRequest).user;
  const propertyId = req.params.id || req.params.propertyId;
  
  if (!propertyId) {
    throw new NotFoundError('Property', 'Property ID not provided');
  }

  // Fetch the property
  const property = await storage.getProperty(propertyId);
  
  if (!property) {
    throw new NotFoundError('Property', propertyId);
  }
  
  // Admin can access any property
  if (user.role === UserRoles.ADMIN) {
    (req as any).property = property;
    return next();
  }
  
  // Agent can only access their own properties
  if (property.agentId !== user.id) {
    throw new AuthorizationError(ErrorMessages.PROPERTY_OWNERSHIP_REQUIRED);
  }
  
  // Attach property to request for use in controllers
  (req as any).property = property;
  next();
});

/**
 * INQUIRY OWNERSHIP MIDDLEWARE
 * For accessing inquiries - agents can see inquiries for their properties
 */
export const requireInquiryOwnership = asyncHandler(async (req: any, res: any, next) => {
  // First ensure user is authenticated
  await new Promise<void>((resolve, reject) => {
    requireAuth(req, res, (err?: any) => {
      if (err) reject(err);
      else resolve();
    });
  });

  const user = (req as AuthenticatedRequest).user;
  const inquiryId = req.params.id || req.params.inquiryId;
  
  if (!inquiryId) {
    throw new NotFoundError('Inquiry', 'Inquiry ID not provided');
  }

  // For now, we'll implement this when we have inquiry retrieval by ID
  // This is a placeholder for future implementation
  // TODO: Implement inquiry ownership check when needed
  
  next();
});

/**
 * APPOINTMENT OWNERSHIP MIDDLEWARE
 * Ensures users can only access appointments they're involved in
 */
export const requireAppointmentOwnership = asyncHandler(async (req: any, res: any, next) => {
  // First ensure user is authenticated
  await new Promise<void>((resolve, reject) => {
    requireAuth(req, res, (err?: any) => {
      if (err) reject(err);
      else resolve();
    });
  });

  const user = (req as AuthenticatedRequest).user;
  const appointmentId = req.params.id || req.params.appointmentId;
  
  if (!appointmentId) {
    throw new NotFoundError('Appointment', 'Appointment ID not provided');
  }

  // Fetch the appointment
  const appointment = await storage.getAppointment(appointmentId);
  
  if (!appointment) {
    throw new NotFoundError('Appointment', appointmentId);
  }
  
  // Admin can access any appointment
  if (user.role === UserRoles.ADMIN) {
    (req as any).appointment = appointment;
    return next();
  }
  
  // Users can only access appointments they are assigned to as agents
  const hasAccess = appointment.agentId === user.id;
  
  if (!hasAccess) {
    throw new AuthorizationError('Acesso negado. Você só pode acessar seus próprios agendamentos.');
  }
  
  // Attach appointment to request for use in controllers
  (req as any).appointment = appointment;
  next();
});

/**
 * GENERIC RESOURCE OWNERSHIP MIDDLEWARE FACTORY
 * Creates ownership middleware for any resource type
 */
export const requireResourceOwnership = (
  resourceName: string,
  getResource: (id: string) => Promise<any>,
  checkOwnership: (resource: any, user: any) => boolean,
  attachAs: string = 'resource'
) => {
  return asyncHandler(async (req: any, res: any, next) => {
    // First ensure user is authenticated
    await new Promise<void>((resolve, reject) => {
      requireAuth(req, res, (err?: any) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const user = (req as AuthenticatedRequest).user;
    const resourceId = req.params.id;
    
    if (!resourceId) {
      throw new NotFoundError(resourceName, 'Resource ID not provided');
    }

    // Fetch the resource
    const resource = await getResource(resourceId);
    
    if (!resource) {
      throw new NotFoundError(resourceName, resourceId);
    }
    
    // Admin can access any resource
    if (user.role === UserRoles.ADMIN) {
      (req as any)[attachAs] = resource;
      return next();
    }
    
    // Check ownership
    if (!checkOwnership(resource, user)) {
      throw new AuthorizationError(`Acesso negado. Você só pode acessar seus próprios ${resourceName.toLowerCase()}.`);
    }
    
    // Attach resource to request
    (req as any)[attachAs] = resource;
    next();
  });
};