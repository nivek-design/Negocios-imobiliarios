import { config as dotenvConfig } from 'dotenv';

// Load environment variables
dotenvConfig();

export const config = {
  // Server Configuration
  port: parseInt(process.env.PORT || '5000', 10),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'premier-properties-secret-key-2024',
    expiresIn: '24h',
    rememberMeExpiresIn: '30d',
  },

  // Database Configuration
  database: {
    url: process.env.DATABASE_URL,
  },

  // External APIs
  googleMaps: {
    apiKey: process.env.GOOGLE_MAPS_API_KEY || '',
  },

  // Email Configuration
  sendGrid: {
    apiKey: process.env.SENDGRID_API_KEY,
    fromEmail: process.env.SENDGRID_FROM_EMAIL || 'noreply@premierproperties.com',
  },

  // Supabase Configuration
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },

  // Cache Configuration (Redis)
  cache: {
    enabled: process.env.REDIS_ENABLED === 'true' || process.env.NODE_ENV === 'production',
    redisUrl: process.env.REDIS_URL || '',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB || '0', 10),
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'kalross',
    defaultTTL: parseInt(process.env.REDIS_DEFAULT_TTL || '300', 10), // 5 minutes default
  },

  // Security Configuration
  security: {
    // Session and Cookie Configuration (existing)
    cookieHttpOnly: true,
    cookieSecure: process.env.NODE_ENV === 'production',
    cookieSameSite: 'strict' as const,
    sessionSecret: process.env.SESSION_SECRET || 'premier-properties-session-secret',
    // Rate Limiting Configuration
    rateLimiting: {
      // Global rate limiting
      global: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10), // 100 requests per window
        skipHealthChecks: true,
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
      },
      // Authentication endpoints
      auth: {
        windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
        maxRequests: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || '5', 10), // 5 attempts per window
        blockDuration: parseInt(process.env.AUTH_BLOCK_DURATION_MS || '3600000', 10), // 1 hour block
      },
      // API endpoints by category
      api: {
        properties: {
          windowMs: parseInt(process.env.PROPERTIES_RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute
          maxRequests: parseInt(process.env.PROPERTIES_RATE_LIMIT_MAX_REQUESTS || '60', 10), // 60 per minute
        },
        inquiries: {
          windowMs: parseInt(process.env.INQUIRIES_RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute
          maxRequests: parseInt(process.env.INQUIRIES_RATE_LIMIT_MAX_REQUESTS || '10', 10), // 10 per minute
        },
        uploads: {
          windowMs: parseInt(process.env.UPLOADS_RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute
          maxRequests: parseInt(process.env.UPLOADS_RATE_LIMIT_MAX_REQUESTS || '3', 10), // 3 per minute
        },
      },
      // Trusted IPs (bypass rate limiting)
      trustedIPs: (process.env.RATE_LIMIT_TRUSTED_IPS || '127.0.0.1,::1').split(',').map(ip => ip.trim()),
    },
    // CORS Configuration
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? (process.env.CORS_ALLOWED_ORIGINS || '').split(',').filter(Boolean)
        : true, // Allow all origins in development
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'Cache-Control',
        'X-Client-Info',
      ],
      exposedHeaders: [
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset',
        'X-Total-Count',
      ],
      credentials: true,
      maxAge: parseInt(process.env.CORS_MAX_AGE || '86400', 10), // 24 hours
    },
    // Content Security Policy
    csp: {
      enabled: process.env.CSP_ENABLED !== 'false',
      reportOnly: process.env.CSP_REPORT_ONLY === 'true',
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: process.env.NODE_ENV === 'production' ? [
          "'self'",
          'https://maps.googleapis.com',
          'https://www.google.com',
          'https://replit.com',
          // Remove 'unsafe-eval' and 'unsafe-inline' in production for security
        ] : [
          "'self'",
          "'unsafe-inline'", // Only allow in development
          "'unsafe-eval'", // Only allow in development  
          'https://maps.googleapis.com',
          'https://www.google.com',
          'https://replit.com',
        ],
        styleSrc: process.env.NODE_ENV === 'production' ? [
          "'self'",
          'https://fonts.googleapis.com',
          // Allow inline styles only for specific needs in production
          "'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='" // Empty style hash
        ] : [
          "'self'",
          "'unsafe-inline'", // Only allow in development
          'https://fonts.googleapis.com',
        ],
        fontSrc: [
          "'self'",
          'https://fonts.gstatic.com',
        ],
        imgSrc: [
          "'self'",
          'data:',
          'https:',
          'blob:',
        ],
        connectSrc: [
          "'self'",
          'https://api.supabase.co',
          'https://*.supabase.co',
          'https://maps.googleapis.com',
          'wss://replit.com',
        ],
        frameSrc: [
          "'self'",
          'https://replit.com',
        ],
      },
    },
    // Request size limits
    limits: {
      jsonBodyLimit: process.env.JSON_BODY_LIMIT || '10mb',
      urlEncodedLimit: process.env.URL_ENCODED_LIMIT || '10mb',
      fileUploadLimit: parseInt(process.env.FILE_UPLOAD_LIMIT || '52428800', 10), // 50MB default
      requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || '30000', 10), // 30 seconds
    },
    // IP Management
    ipManagement: {
      blockedIPs: (process.env.BLOCKED_IPS || '').split(',').filter(Boolean),
      whitelistedIPs: (process.env.WHITELISTED_IPS || '127.0.0.1,::1').split(',').filter(Boolean),
      enableGeoBlocking: process.env.ENABLE_GEO_BLOCKING === 'true',
      blockedCountries: (process.env.BLOCKED_COUNTRIES || '').split(',').filter(Boolean),
    },
    // Security headers
    headers: {
      removeXPoweredBy: true,
      hsts: {
        maxAge: parseInt(process.env.HSTS_MAX_AGE || '31536000', 10), // 1 year
        includeSubDomains: true,
        preload: true,
      },
      xssProtection: true,
      noSniff: true,
      frameguard: {
        action: 'deny' as const,
      },
      referrerPolicy: 'strict-origin-when-cross-origin' as const,
    },
    // Input validation and sanitization
    validation: {
      enableHtmlSanitization: process.env.ENABLE_HTML_SANITIZATION !== 'false',
      enableSqlInjectionProtection: true,
      enableXssProtection: true,
      enablePathTraversalProtection: true,
      maxInputLength: parseInt(process.env.MAX_INPUT_LENGTH || '10000', 10),
    },
    // Brute force protection
    bruteForce: {
      freeRetries: parseInt(process.env.BRUTE_FORCE_FREE_RETRIES || '5', 10),
      minWait: parseInt(process.env.BRUTE_FORCE_MIN_WAIT || '300000', 10), // 5 minutes
      maxWait: parseInt(process.env.BRUTE_FORCE_MAX_WAIT || '3600000', 10), // 1 hour
      failsBeforeBrute: parseInt(process.env.FAILS_BEFORE_BRUTE || '3', 10),
    },
    // Security logging
    logging: {
      enableSecurityLogs: process.env.ENABLE_SECURITY_LOGS !== 'false',
      logRateLimitHits: process.env.LOG_RATE_LIMIT_HITS !== 'false',
      logFailedAuth: process.env.LOG_FAILED_AUTH !== 'false',
      logSuspiciousActivity: process.env.LOG_SUSPICIOUS_ACTIVITY !== 'false',
      logLevel: process.env.SECURITY_LOG_LEVEL || 'info',
    },
  },

  // Development flags
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
} as const;