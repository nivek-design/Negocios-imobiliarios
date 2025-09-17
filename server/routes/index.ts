import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "../replitAuth";
import { errorHandler, notFoundHandler } from "../middlewares/error";
import { 
  authRateLimit,
  propertiesRateLimit,
  inquiriesRateLimit,
  uploadsRateLimit,
  rateLimitHealthCheck
} from "../middlewares/rateLimiting";
import {
  sqlInjectionProtection,
  pathTraversalProtection,
  suspiciousActivityDetection,
  securityHealthCheck
} from "../middlewares/security";
import { validationHealthCheck } from "../middlewares/validate";

// Import all module routes
import { authRoutes } from "../modules/auth";
import { 
  propertiesRoutes, 
  agentPropertiesRoutes, 
  userPropertiesRoutes, 
  propertyImagesRoutes 
} from "../modules/properties";
import { 
  inquiriesRoutes, 
  agentInquiriesRoutes, 
  propertyInquiriesRoutes 
} from "../modules/inquiries";
import { 
  appointmentsRoutes, 
  agentAppointmentsRoutes, 
  propertyAppointmentsRoutes,
  agentAvailabilityRoutes 
} from "../modules/appointments";
import { 
  agentMetricsRoutes, 
  propertyMetricsRoutes,
  adminMetricsRoutes 
} from "../modules/metrics";
import { 
  objectsRoutes, 
  publicObjectsRoutes, 
  protectedObjectsRoutes 
} from "../modules/objects";
import { configRoutes } from "../modules/config";

// Import observability routes
import { observabilityRoutes } from "./observability";

/**
 * MODULAR ROUTES AGGREGATOR
 * 
 * This file replaces the monolithic server/routes.ts and aggregates 
 * all modularized routes while maintaining 100% API compatibility.
 * 
 * The modular architecture provides:
 * - Clean separation of concerns
 * - Centralized error handling
 * - Consistent validation and authorization patterns
 * - Maintainable and scalable code structure
 * - Type-safe request/response handling
 */

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize Replit Auth (minimal setup for compatibility)
  await setupAuth(app);
  
  // 🔒 ADDITIONAL SECURITY MIDDLEWARE (applied to all API routes)
  app.use("/api", sqlInjectionProtection);
  app.use("/api", pathTraversalProtection);
  app.use("/api", suspiciousActivityDetection);

  // 🏥 HEALTH AND OBSERVABILITY ENDPOINTS (before main API routes)
  app.use("/api", observabilityRoutes);
  
  // 🏥 SECURITY HEALTH CHECK ENDPOINTS (legacy - maintained for compatibility)
  app.get("/api/health/security", securityHealthCheck);
  app.get("/api/health/rate-limiting", rateLimitHealthCheck);
  app.get("/api/health/validation", validationHealthCheck);

  // Mount public object storage routes (must come before API routes)
  app.use("/public-objects", uploadsRateLimit, publicObjectsRoutes);
  app.use("/objects", uploadsRateLimit, protectedObjectsRoutes);

  // 🔒 MOUNT API ROUTES WITH SPECIFIC RATE LIMITING
  // Authentication routes - strict rate limiting
  app.use("/api/auth", authRateLimit, authRoutes);
  
  // Properties routes - moderate rate limiting
  app.use("/api/properties", propertiesRateLimit, propertiesRoutes);
  
  // Inquiries routes - strict rate limiting (spam protection)
  app.use("/api/inquiries", inquiriesRateLimit, inquiriesRoutes);
  
  // Other API routes with standard rate limiting
  app.use("/api/appointments", appointmentsRoutes);
  app.use("/api/objects", uploadsRateLimit, objectsRoutes);
  app.use("/api/config", configRoutes);

  // Mount aggregated routes with specific path patterns and appropriate rate limiting
  // Agent-specific routes - properties have moderate limits, inquiries strict
  app.use("/api/agent/properties", propertiesRateLimit, agentPropertiesRoutes);
  app.use("/api/agent/inquiries", inquiriesRateLimit, agentInquiriesRoutes);
  app.use("/api/agent/appointments", agentAppointmentsRoutes);
  app.use("/api/agent/metrics", agentMetricsRoutes);

  // User-specific routes
  app.use("/api/user", propertiesRateLimit, userPropertiesRoutes);

  // Property-related nested routes
  app.use("/api/properties", inquiriesRateLimit, propertyInquiriesRoutes);
  app.use("/api/properties", propertyAppointmentsRoutes);
  app.use("/api/properties", propertyMetricsRoutes);

  // Agent availability routes
  app.use("/api/agents", agentAvailabilityRoutes);

  // Admin routes (no rate limiting for admin functions)
  app.use("/api/admin/metrics", adminMetricsRoutes);

  // Legacy property images route (for compatibility) - upload limits
  app.use("/api/property-images", uploadsRateLimit, propertyImagesRoutes);

  // Cache health check endpoint
  const { cacheHealthCheck } = await import("../middlewares/cache");
  app.get("/api/health/cache", cacheHealthCheck);

  // Error handling middleware (notFoundHandler will be added after Vite setup)
  app.use(errorHandler);

  // Create HTTP server
  const server = createServer(app);

  console.log("✅ Modular routes system initialized successfully");
  console.log("📊 Modules loaded:");
  console.log("   - Authentication (auth)");
  console.log("   - Properties Management (properties)");
  console.log("   - Customer Inquiries (inquiries)");
  console.log("   - Appointment Scheduling (appointments)");
  console.log("   - Analytics & Metrics (metrics)");
  console.log("   - Object Storage (objects)");
  console.log("   - System Configuration (config)");

  return server;
}