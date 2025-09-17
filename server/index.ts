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

const app = express();

// 🔒 TRUST PROXY CONFIGURATION - Critical for rate limiting security
app.set('trust proxy', 1); // Trust first proxy (required for proper IP detection)

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

// Note: SQL injection and path traversal protection are mounted on /api routes in routes/index.ts

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Create test users on startup in development
  if (app.get("env") === "development") {
    try {
      const { createTestUsers } = await import('./testUsers');
      await createTestUsers();
    } catch (error) {
      console.log('Test users creation skipped:', error);
    }
  }


  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
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
    log(`serving on port ${port}`);
  });
})();
