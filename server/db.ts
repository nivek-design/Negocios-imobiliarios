import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure connection pool with proper limits to prevent connection issues
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 5, // Maximum number of connections in the pool
  idleTimeoutMillis: 30000, // Close connections after 30 seconds of inactivity
  connectionTimeoutMillis: 10000, // Wait up to 10 seconds for a connection
  maxUses: 7500, // Close connections after 7500 uses to prevent memory leaks
  allowExitOnIdle: true // Allow the process to exit when all connections are idle
});

export const db = drizzle({ client: pool, schema });

// Handle pool errors gracefully
pool.on('error', (err) => {
  console.error('Database pool error:', err);
});

// Graceful shutdown handler
process.on('SIGINT', () => {
  console.log('Received SIGINT, closing database pool...');
  pool.end();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, closing database pool...');
  pool.end();
  process.exit(0);
});