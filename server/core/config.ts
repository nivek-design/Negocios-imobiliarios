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

  // Security Configuration
  security: {
    cookieHttpOnly: true,
    cookieSecure: process.env.NODE_ENV === 'production',
    cookieSameSite: 'strict' as const,
    sessionSecret: process.env.SESSION_SECRET || 'premier-properties-session-secret',
  },

  // Development flags
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
} as const;