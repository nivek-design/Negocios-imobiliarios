import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "../replitAuth";
import { errorHandler, notFoundHandler } from "../middlewares/error";

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

  // Mount public object storage routes (must come before API routes)
  app.use("/public-objects", publicObjectsRoutes);
  app.use("/objects", protectedObjectsRoutes);

  // Mount API routes with /api prefix
  app.use("/api/auth", authRoutes);
  app.use("/api/properties", propertiesRoutes);
  app.use("/api/inquiries", inquiriesRoutes);
  app.use("/api/appointments", appointmentsRoutes);
  app.use("/api/objects", objectsRoutes);
  app.use("/api/config", configRoutes);

  // Mount aggregated routes with specific path patterns
  // Agent-specific routes
  app.use("/api/agent/properties", agentPropertiesRoutes);
  app.use("/api/agent/inquiries", agentInquiriesRoutes);
  app.use("/api/agent/appointments", agentAppointmentsRoutes);
  app.use("/api/agent/metrics", agentMetricsRoutes);

  // User-specific routes
  app.use("/api/user", userPropertiesRoutes);

  // Property-related nested routes
  app.use("/api/properties", propertyInquiriesRoutes);
  app.use("/api/properties", propertyAppointmentsRoutes);
  app.use("/api/properties", propertyMetricsRoutes);

  // Agent availability routes
  app.use("/api/agents", agentAvailabilityRoutes);

  // Admin routes
  app.use("/api/admin/metrics", adminMetricsRoutes);

  // Legacy property images route (for compatibility)
  app.use("/api/property-images", propertyImagesRoutes);

  // Error handling middleware (must be last)
  app.use(notFoundHandler);
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