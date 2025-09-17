import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes/index";
import { setupVite, serveStatic, log } from "./vite";
import { config } from "./core/config";
import { 
  securityHeaders, 
  corsConfiguration, 
  sanitizeInputs,
  requestTimeout,
  requestSizeLimit
} from "./middlewares/security";
import { 
  globalRateLimit, 
  ipBlockingMiddleware
} from "./middlewares/rateLimiting";
import {
  initializeRequestLogging,
  logRequest,
  logResponse,
  logError,
  requestResponseLogger
} from "./middlewares/logging";
import { logger } from "./core/logger";
import { performanceMonitor } from "./core/monitoring";
import { healthMonitor } from "./core/health";

const app = express();

// 🔒 TRUST PROXY CONFIGURATION - Critical for rate limiting security
app.set('trust proxy', 1); // Trust first proxy (required for proper IP detection)

// 📊 INITIALIZE MONITORING AND LOGGING
logger.info('Starting Kalross Real Estate server', {
  environment: config.nodeEnv,
  version: process.env.npm_package_version || '1.0.0',
  nodeVersion: process.version,
});

// 📊 REQUEST LOGGING INITIALIZATION - Must be early for proper context
app.use(initializeRequestLogging);

// 🔒 SECURITY MIDDLEWARE - Applied before all other middleware
// IP blocking (first line of defense)
app.use(ipBlockingMiddleware);

// Security headers (helmet)
app.use(securityHeaders);

// CORS configuration
app.use(corsConfiguration);

// Global rate limiting
app.use(globalRateLimit);

// Request timeout
app.use(requestTimeout);

// Request size limiting
app.use(requestSizeLimit);

// Body parsing with size limits
app.use(express.json({ limit: config.security.limits.jsonBodyLimit }));
app.use(express.urlencoded({ 
  extended: false, 
  limit: config.security.limits.urlEncodedLimit 
}));

// Input sanitization
app.use(sanitizeInputs);

// 📊 REQUEST LOGGING - Log all incoming requests
app.use(logRequest);

// Note: SQL injection and path traversal protection are mounted on /api routes in routes/index.ts

// 📊 RESPONSE LOGGING - Log all outgoing responses with performance metrics
app.use(logResponse);

(async () => {
  const server = await registerRoutes(app);

  // Create test users on startup in development
  if (app.get("env") === "development") {
    try {
      const { createTestUsers } = await import('./testUsers');
      await createTestUsers();
      logger.info('Test users created successfully');
    } catch (error) {
      logger.warn('Test users creation skipped', { error: error instanceof Error ? error.message : String(error) });
    }
  }


  // Add error handling middleware (must be after routes)
  app.use(logError);
  
  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
    logger.info('Vite development server configured');
  } else {
    serveStatic(app);
    logger.info('Static file serving configured for production');
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    logger.info('Server started successfully', {
      port,
      host: '0.0.0.0',
      environment: config.nodeEnv,
      process: {
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
      monitoring: {
        performanceMonitorActive: true,
        healthMonitorActive: true,
      },
    });
    
    log(`serving on port ${port}`);
  });
  
  // Graceful shutdown handling
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, starting graceful shutdown');
    server.close(() => {
      logger.info('HTTP server closed');
      healthMonitor.shutdown();
      logger.info('Health monitor shutdown');
      process.exit(0);
    });
  });
  
  process.on('SIGINT', () => {
    logger.info('SIGINT received, starting graceful shutdown');
    server.close(() => {
      logger.info('HTTP server closed');
      healthMonitor.shutdown();
      logger.info('Health monitor shutdown');
      process.exit(0);
    });
  });
})();
