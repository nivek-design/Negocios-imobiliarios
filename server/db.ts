import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { sql } from 'drizzle-orm';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Database performance metrics
export interface DatabaseMetrics {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingConnections: number;
  queryCount: number;
  slowQueryCount: number;
  averageQueryTime: number;
  errors: number;
}

// Query performance tracking
class QueryTracker {
  private metrics: DatabaseMetrics = {
    totalConnections: 0,
    activeConnections: 0,
    idleConnections: 0,
    waitingConnections: 0,
    queryCount: 0,
    slowQueryCount: 0,
    averageQueryTime: 0,
    errors: 0
  };
  
  private queryTimes: number[] = [];
  private readonly SLOW_QUERY_THRESHOLD = 1000; // 1 second
  private readonly MAX_QUERY_TIMES = 1000; // Keep last 1000 query times

  trackQuery(duration: number, queryName?: string) {
    this.metrics.queryCount++;
    this.queryTimes.push(duration);
    
    if (this.queryTimes.length > this.MAX_QUERY_TIMES) {
      this.queryTimes.shift();
    }
    
    if (duration > this.SLOW_QUERY_THRESHOLD) {
      this.metrics.slowQueryCount++;
      console.warn(`🐌 Slow query detected: ${queryName || 'unknown'} - ${duration}ms`);
    }
    
    this.metrics.averageQueryTime = this.queryTimes.reduce((a, b) => a + b, 0) / this.queryTimes.length;
  }

  trackError() {
    this.metrics.errors++;
  }

  updateConnectionMetrics(poolStats: any) {
    this.metrics.totalConnections = poolStats.totalCount || 0;
    this.metrics.activeConnections = (poolStats.totalCount || 0) - (poolStats.idleCount || 0);
    this.metrics.idleConnections = poolStats.idleCount || 0;
    this.metrics.waitingConnections = poolStats.waitingCount || 0;
  }

  getMetrics(): DatabaseMetrics {
    return { ...this.metrics };
  }

  reset() {
    this.metrics = {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      waitingConnections: 0,
      queryCount: 0,
      slowQueryCount: 0,
      averageQueryTime: 0,
      errors: 0
    };
    this.queryTimes = [];
  }
}

export const queryTracker = new QueryTracker();

// Optimized connection pool configuration
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  // Connection limits optimized for serverless
  max: 10, // Increased for better concurrency
  min: 1, // Maintain minimum connections
  // Timeout configurations
  idleTimeoutMillis: 60000, // Increased to 60s for better connection reuse
  connectionTimeoutMillis: 15000, // Increased to 15s for slower networks
  acquireTimeoutMillis: 10000, // Time to wait for connection from pool
  // Connection lifecycle
  maxUses: 10000, // Increased for better connection reuse
  allowExitOnIdle: true,
  // Health check configuration
  keepAlive: true,
  keepAliveInitialDelayMillis: 0,
});

// Enhanced database client with monitoring
export const db = drizzle({ client: pool, schema });

// Connection pool monitoring and health checks
pool.on('error', (err) => {
  console.error('🚨 Database pool error:', err);
  queryTracker.trackError();
});

pool.on('connect', () => {
  console.log('🔌 Database connection established');
});

pool.on('acquire', () => {
  console.log('📝 Database connection acquired from pool');
});

pool.on('release', () => {
  console.log('🔄 Database connection released to pool');
});

// Database health check function
export const checkDatabaseHealth = async (): Promise<{
  status: 'healthy' | 'unhealthy';
  metrics: DatabaseMetrics;
  poolStats: any;
  latency: number;
}> => {
  const start = Date.now();
  
  try {
    // Test connection with simple query
    await db.execute(sql`SELECT 1`);
    const latency = Date.now() - start;
    
    // Get pool statistics (if available)
    const poolStats = {
      totalCount: (pool as any).totalCount,
      idleCount: (pool as any).idleCount,
      waitingCount: (pool as any).waitingCount,
    };
    
    queryTracker.updateConnectionMetrics(poolStats);
    
    return {
      status: 'healthy',
      metrics: queryTracker.getMetrics(),
      poolStats,
      latency
    };
  } catch (error) {
    console.error('❌ Database health check failed:', error);
    queryTracker.trackError();
    
    return {
      status: 'unhealthy',
      metrics: queryTracker.getMetrics(),
      poolStats: null,
      latency: Date.now() - start
    };
  }
};

// Query performance wrapper
export const executeWithMetrics = async <T>(queryFn: () => Promise<T>, queryName?: string): Promise<T> => {
  const start = Date.now();
  
  try {
    const result = await queryFn();
    const duration = Date.now() - start;
    
    queryTracker.trackQuery(duration, queryName);
    
    if (queryName && duration > 100) {
      console.log(`⚡ Query "${queryName}" executed in ${duration}ms`);
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    queryTracker.trackQuery(duration, queryName);
    queryTracker.trackError();
    
    console.error(`❌ Query "${queryName || 'unknown'}" failed after ${duration}ms:`, error);
    throw error;
  }
};

// Periodic health monitoring (every 5 minutes)
setInterval(async () => {
  try {
    const health = await checkDatabaseHealth();
    if (health.status === 'healthy') {
      console.log(`💚 Database healthy - Latency: ${health.latency}ms, Active connections: ${health.metrics.activeConnections}`);
    } else {
      console.warn(`⚠️ Database health check failed`);
    }
  } catch (error) {
    console.error('Failed to perform health check:', error);
  }
}, 5 * 60 * 1000);

// Enhanced graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  console.log(`📊 Database shutdown initiated (${signal})`);
  
  // Log final metrics
  const finalMetrics = queryTracker.getMetrics();
  console.log(`📈 Final database metrics:`, finalMetrics);
  
  try {
    // Close all connections
    await pool.end();
    console.log('✅ Database pool closed successfully');
  } catch (error) {
    console.error('❌ Error closing database pool:', error);
  }
  
  process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // Nodemon restart

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
  queryTracker.trackError();
});

// Export soft delete utility functions
export const withoutSoftDeleted = sql`deleted_at IS NULL`;
export const onlySoftDeleted = sql`deleted_at IS NOT NULL`;
export const withSoftDeleted = sql`1=1`; // Include all records