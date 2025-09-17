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

  // Comprehensive Logging Configuration
  logging: {
    // Global logging settings
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
    enableConsole: process.env.LOG_CONSOLE !== 'false',
    enableFile: process.env.LOG_FILE !== 'false' || process.env.NODE_ENV === 'production',
    
    // File logging configuration
    files: {
      maxSize: process.env.LOG_MAX_SIZE || '20m',
      maxFiles: process.env.LOG_MAX_FILES || '14d',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      directory: process.env.LOG_DIRECTORY || 'logs',
    },
    
    // Error logging specific settings
    error: {
      maxSize: process.env.ERROR_LOG_MAX_SIZE || '50m',
      maxFiles: process.env.ERROR_LOG_MAX_FILES || '30d',
      level: 'error',
      separateFile: true,
    },
    
    // Security audit logging
    security: {
      enabled: process.env.SECURITY_LOGGING_ENABLED !== 'false',
      maxSize: process.env.SECURITY_LOG_MAX_SIZE || '100m',
      maxFiles: process.env.SECURITY_LOG_MAX_FILES || '90d',
      separateFile: true,
    },
    
    // Performance logging
    performance: {
      enabled: process.env.PERFORMANCE_LOGGING_ENABLED !== 'false',
      maxSize: process.env.PERFORMANCE_LOG_MAX_SIZE || '50m',
      maxFiles: process.env.PERFORMANCE_LOG_MAX_FILES || '30d',
      slowQueryThreshold: parseInt(process.env.SLOW_QUERY_THRESHOLD || '1000', 10), // 1 second
      slowRequestThreshold: parseInt(process.env.SLOW_REQUEST_THRESHOLD || '2000', 10), // 2 seconds
      separateFile: process.env.NODE_ENV === 'production',
    },
    
    // Request/Response logging
    requests: {
      enabled: process.env.REQUEST_LOGGING_ENABLED !== 'false',
      skipPaths: (process.env.LOG_SKIP_PATHS || '/health,/favicon.ico,/robots.txt').split(','),
      skipUserAgents: (process.env.LOG_SKIP_USER_AGENTS || 'kube-probe,health-check').split(','),
      logHeaders: process.env.LOG_HEADERS !== 'false',
      logBody: process.env.LOG_REQUEST_BODY === 'true',
      maxBodySize: parseInt(process.env.LOG_MAX_BODY_SIZE || '1024', 10), // 1KB
    },
    
    // Business logic logging
    business: {
      enabled: process.env.BUSINESS_LOGGING_ENABLED !== 'false',
      trackUserActions: process.env.TRACK_USER_ACTIONS !== 'false',
      trackPropertyOperations: process.env.TRACK_PROPERTY_OPS !== 'false',
      trackInquiries: process.env.TRACK_INQUIRIES !== 'false',
      trackAppointments: process.env.TRACK_APPOINTMENTS !== 'false',
    },
    
    // Database logging
    database: {
      enabled: process.env.DB_LOGGING_ENABLED !== 'false',
      logQueries: process.env.LOG_DB_QUERIES === 'true',
      logSlowQueries: process.env.LOG_SLOW_QUERIES !== 'false',
      logConnections: process.env.LOG_DB_CONNECTIONS !== 'false',
      logErrors: process.env.LOG_DB_ERRORS !== 'false',
    },
    
    // Cache logging
    cache: {
      enabled: process.env.CACHE_LOGGING_ENABLED !== 'false',
      logHitMiss: process.env.LOG_CACHE_HIT_MISS !== 'false',
      logOperations: process.env.LOG_CACHE_OPS === 'true',
      logErrors: process.env.LOG_CACHE_ERRORS !== 'false',
    },
    
    // External API logging
    externalApis: {
      enabled: process.env.EXTERNAL_API_LOGGING_ENABLED !== 'false',
      logCalls: process.env.LOG_API_CALLS !== 'false',
      logErrors: process.env.LOG_API_ERRORS !== 'false',
      logPerformance: process.env.LOG_API_PERFORMANCE !== 'false',
    },
    
    // Sensitive data filtering
    sanitization: {
      enabled: process.env.LOG_SANITIZATION !== 'false',
      sensitiveFields: (process.env.SENSITIVE_FIELDS || 'password,token,secret,key,authorization,cookie,session,jwt,auth,credential,email,phone,cpf,rg,passport').split(','),
      maskLength: parseInt(process.env.MASK_LENGTH || '4', 10),
      replaceWith: process.env.MASK_REPLACE_WITH || '[REDACTED]',
    },
    
    // Monitoring and alerting
    monitoring: {
      enabled: process.env.LOG_MONITORING_ENABLED !== 'false',
      errorThreshold: parseInt(process.env.ERROR_THRESHOLD || '10', 10), // errors per minute
      warningThreshold: parseInt(process.env.WARNING_THRESHOLD || '50', 10), // warnings per minute
      performanceThreshold: parseInt(process.env.PERF_THRESHOLD || '2000', 10), // 2 seconds
      healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '60000', 10), // 1 minute
    },
    
    // Environment-specific settings
    environments: {
      development: {
        level: 'debug',
        enableConsole: true,
        enableFile: false,
        colorize: true,
        prettyPrint: true,
      },
      production: {
        level: 'info',
        enableConsole: false,
        enableFile: true,
        colorize: false,
        prettyPrint: false,
        enableMetrics: true,
        enableAlerting: true,
      },
      test: {
        level: 'error',
        enableConsole: false,
        enableFile: false,
      },
    },
  },

  // Development flags
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
} as const;