import Redis, { type RedisOptions } from 'ioredis';
import { config } from './config';

/**
 * REDIS CACHE SERVICE - PRODUCTION READY
 * 
 * Centralized cache service with Redis connection and intelligent fallback.
 * Features:
 * - Connection pooling and health monitoring
 * - Graceful fallback when Redis is unavailable
 * - Automatic key prefixing and namespacing
 * - TTL management and cache invalidation
 * - Performance metrics and logging
 */

export interface CacheConfig {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Cache tags for group invalidation
  keyPrefix?: string; // Key prefix for namespacing
}

export interface CacheStats {
  hits: number;
  misses: number;
  errors: number;
  operations: number;
}

class CacheService {
  private client: Redis | null = null;
  private isConnected = false;
  private connectionAttempts = 0;
  private maxConnectionAttempts = 3;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    errors: 0,
    operations: 0
  };

  constructor() {
    this.initializeRedis();
  }

  /**
   * Initialize Redis connection with automatic retry and fallback
   */
  private async initializeRedis(): Promise<void> {
    if (!config.cache.enabled || !config.cache.redisUrl) {
      console.log('🔄 Cache: Redis disabled or URL not configured, running without cache');
      return;
    }

    try {
      const redisOptions: RedisOptions = {
        maxRetriesPerRequest: 3,
        connectTimeout: 10000,
        lazyConnect: true,
        // Parse Redis URL if provided
        ...(config.cache.redisUrl.startsWith('redis://') ? {} : {
          host: config.cache.host,
          port: config.cache.port,
          password: config.cache.password,
          db: config.cache.db,
        })
      };

      this.client = config.cache.redisUrl.startsWith('redis://') 
        ? new Redis(config.cache.redisUrl, redisOptions)
        : new Redis(redisOptions);

      // Connection event handlers
      this.client.on('connect', () => {
        console.log('✅ Cache: Redis connected successfully');
        this.isConnected = true;
        this.connectionAttempts = 0;
      });

      this.client.on('error', (error) => {
        console.error('❌ Cache: Redis connection error:', error.message);
        this.isConnected = false;
        this.stats.errors++;
      });

      this.client.on('close', () => {
        console.log('🔄 Cache: Redis connection closed');
        this.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        this.connectionAttempts++;
        console.log(`🔄 Cache: Reconnecting to Redis (attempt ${this.connectionAttempts})`);
      });

      // Test connection
      await this.client.connect();
      
    } catch (error) {
      console.error('❌ Cache: Failed to initialize Redis:', error);
      this.client = null;
      this.isConnected = false;
    }
  }

  /**
   * Generate cache key with prefix and namespace
   */
  generateKey(baseKey: string, prefix?: string): string {
    const keyPrefix = prefix || config.cache.keyPrefix;
    return `${keyPrefix}:${baseKey}`;
  }

  /**
   * Get value from cache
   */
  async get<T = any>(key: string, keyPrefix?: string): Promise<T | null> {
    this.stats.operations++;
    
    if (!this.isAvailable()) {
      this.stats.misses++;
      return null;
    }

    try {
      const cacheKey = this.generateKey(key, keyPrefix);
      const value = await this.client!.get(cacheKey);
      
      if (value === null) {
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      return JSON.parse(value);
    } catch (error) {
      console.error('❌ Cache: Error getting key:', error);
      this.stats.errors++;
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set<T = any>(key: string, value: T, cacheConfig: CacheConfig = {}): Promise<boolean> {
    this.stats.operations++;
    
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const cacheKey = this.generateKey(key, cacheConfig.keyPrefix);
      const ttl = cacheConfig.ttl || config.cache.defaultTTL;
      const serializedValue = JSON.stringify(value);

      // Set value with TTL
      await this.client!.setex(cacheKey, ttl, serializedValue);

      // Store cache tags for group invalidation
      if (cacheConfig.tags && cacheConfig.tags.length > 0) {
        for (const tag of cacheConfig.tags) {
          const tagKey = this.generateKey(`tag:${tag}`, cacheConfig.keyPrefix);
          await this.client!.sadd(tagKey, cacheKey);
          await this.client!.expire(tagKey, ttl + 60); // Tag expires slightly after cache
        }
      }

      return true;
    } catch (error) {
      console.error('❌ Cache: Error setting key:', error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Delete specific key from cache
   */
  async del(key: string, keyPrefix?: string): Promise<boolean> {
    this.stats.operations++;
    
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const cacheKey = this.generateKey(key, keyPrefix);
      await this.client!.del(cacheKey);
      return true;
    } catch (error) {
      console.error('❌ Cache: Error deleting key:', error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[], keyPrefix?: string): Promise<boolean> {
    this.stats.operations++;
    
    if (!this.isAvailable()) {
      return false;
    }

    try {
      for (const tag of tags) {
        const tagKey = this.generateKey(`tag:${tag}`, keyPrefix);
        const keys = await this.client!.smembers(tagKey);
        
        if (keys.length > 0) {
          await this.client!.del(...keys);
          console.log(`🔄 Cache: Invalidated ${keys.length} keys for tag '${tag}'`);
        }
        
        // Remove the tag set
        await this.client!.del(tagKey);
      }
      return true;
    } catch (error) {
      console.error('❌ Cache: Error invalidating by tags:', error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Clear all cache entries with optional pattern
   */
  async clear(pattern?: string, keyPrefix?: string): Promise<boolean> {
    this.stats.operations++;
    
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const searchPattern = pattern 
        ? this.generateKey(pattern, keyPrefix)
        : this.generateKey('*', keyPrefix);
      
      const keys = await this.client!.keys(searchPattern);
      
      if (keys.length > 0) {
        await this.client!.del(...keys);
        console.log(`🔄 Cache: Cleared ${keys.length} keys matching pattern '${searchPattern}'`);
      }
      
      return true;
    } catch (error) {
      console.error('❌ Cache: Error clearing cache:', error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Check if cache service is available
   */
  isAvailable(): boolean {
    return this.client !== null && this.isConnected;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      errors: 0,
      operations: 0
    };
  }

  /**
   * Health check for monitoring
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy' | 'disabled', details: any }> {
    if (!config.cache.enabled) {
      return {
        status: 'disabled',
        details: {
          message: 'Cache is disabled',
          stats: this.stats
        }
      };
    }

    if (!this.isAvailable()) {
      return {
        status: 'unhealthy',
        details: {
          message: 'Redis connection unavailable',
          connectionAttempts: this.connectionAttempts,
          stats: this.stats
        }
      };
    }

    try {
      // Test Redis operation
      const testKey = this.generateKey('health-check');
      const testValue = { timestamp: Date.now() };
      
      await this.client!.setex(testKey, 5, JSON.stringify(testValue));
      const retrieved = await this.client!.get(testKey);
      await this.client!.del(testKey);
      
      const isWorking = retrieved !== null && JSON.parse(retrieved).timestamp === testValue.timestamp;
      
      return {
        status: isWorking ? 'healthy' : 'unhealthy',
        details: {
          message: isWorking ? 'Cache is working correctly' : 'Cache test failed',
          connected: this.isConnected,
          stats: this.stats
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          message: 'Health check failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          stats: this.stats
        }
      };
    }
  }

  /**
   * Graceful shutdown
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.disconnect();
        console.log('✅ Cache: Redis disconnected gracefully');
      } catch (error) {
        console.error('❌ Cache: Error during disconnect:', error);
      }
    }
  }
}

// Export singleton instance
export const cacheService = new CacheService();

// Types are exported inline with interfaces above