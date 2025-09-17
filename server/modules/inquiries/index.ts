/**
 * INQUIRIES MODULE EXPORTS
 * Central export point for the inquiries module
 */

export { InquiriesController } from './inquiries.controller';
export { InquiriesService } from './inquiries.service';
export { 
  inquiriesRoutes, 
  agentInquiriesRoutes, 
  propertyInquiriesRoutes 
} from './inquiries.routes';
export * from './inquiries.validators';
export * as InquiriesTypes from './inquiries.validators';