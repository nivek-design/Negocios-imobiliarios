import { Request, Response, NextFunction } from 'express';
import { cacheService, type CacheConfig } from '../core/cache';
import { asyncHandler } from '../core/asyncHandler';

/**
 * CACHE MIDDLEWARE - PRODUCTION READY
 * 
 * Intelligent cache middleware for automatic GET request caching with:
 * - Configurable TTL per route
 * - Smart cache invalidation by tags
 * - Performance monitoring with HTTP headers
 * - Transparent fallback when Redis unavailable
 * - Support for user-specific and public caches
 */

export interface CacheOptions extends CacheConfig {
  condition?: (req: Request) => boolean; // Custom cache condition
  varyBy?: string[]; // Request properties to vary cache by (e.g., ['user.id', 'query.page'])
  skipIf?: (req: Request, res: Response) => boolean; // Skip caching condition
  dynamicTags?: (string | ((req: Request) => string))[]; // Support for dynamic tags resolved at request time
}

/**
 * Cache middleware factory for GET requests
 */
export const cache = (options: CacheOptions = {}) => {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip if condition not met
    if (options.condition && !options.condition(req)) {
      return next();
    }

    // Skip if skipIf condition is true
    if (options.skipIf && options.skipIf(req, res)) {
      return next();
    }

    const startTime = Date.now();
    
    // Generate cache key based on URL and vary parameters
    const cacheKey = generateCacheKey(req, options);
    
    // Try to get from cache
    const cachedResponse = await cacheService.get(cacheKey, options.keyPrefix);
    
    if (cachedResponse) {
      // Cache hit - return cached response
      const hitTime = Date.now() - startTime;
      
      // Add cache debug headers
      res.set({
        'X-Cache-Status': 'HIT',
        'X-Cache-Key': cacheKey,
        'X-Cache-Time': `${hitTime}ms`,
        'X-Cache-TTL': String(options.ttl || 300),
      });
      
      console.log(`🎯 Cache HIT: ${req.method} ${req.path} (${hitTime}ms)`);
      
      return res.json(cachedResponse);
    }

    // Cache miss - continue to route handler
    const missTime = Date.now() - startTime;
    console.log(`❌ Cache MISS: ${req.method} ${req.path} (${missTime}ms)`);

    // Intercept response to cache it
    const originalJson = res.json;
    let responseData: any = null;
    let responseCached = false;

    res.json = function(data: any) {
      responseData = data;
      
      // Cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300 && !responseCached) {
        setImmediate(async () => {
          try {
            // Resolve dynamic tags at request time
            const resolvedOptions = resolveCacheOptions(options, req);
            await cacheService.set(cacheKey, data, resolvedOptions);
            console.log(`💾 Cached response: ${cacheKey} (TTL: ${options.ttl || 300}s) Tags: [${resolvedOptions.tags?.join(', ') || 'none'}]`);
          } catch (error) {
            console.error('❌ Cache: Failed to cache response:', error);
          }
        });
        responseCached = true;
      }

      // Add cache debug headers
      res.set({
        'X-Cache-Status': 'MISS',
        'X-Cache-Key': cacheKey,
        'X-Cache-Time': `${missTime}ms`,
        'X-Cache-TTL': String(options.ttl || 300),
      });

      return originalJson.call(this, data);
    };

    next();
  });
};

/**
 * Generate cache key based on request and vary parameters
 */
function generateCacheKey(req: Request, options: CacheOptions): string {
  const basePath = req.path;
  const keyParts: string[] = [basePath];

  // Add query parameters to key
  const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
  if (queryString) {
    keyParts.push(`query:${queryString}`);
  }

  // Add vary parameters
  if (options.varyBy) {
    for (const varyParam of options.varyBy) {
      const value = getNestedValue(req, varyParam);
      if (value !== undefined) {
        keyParts.push(`${varyParam}:${value}`);
      }
    }
  }

  return keyParts.join('|');
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Resolve dynamic tags and cache options at request time
 */
function resolveCacheOptions(options: CacheOptions, req: Request): CacheConfig {
  const resolved: CacheConfig = { ...options };
  
  // Resolve dynamic tags
  if (options.dynamicTags) {
    const resolvedTags: string[] = [];
    
    // Add static tags first
    if (options.tags) {
      resolvedTags.push(...options.tags);
    }
    
    // Resolve dynamic tags
    for (const tag of options.dynamicTags) {
      if (typeof tag === 'string') {
        resolvedTags.push(tag);
      } else {
        try {
          const dynamicTag = tag(req);
          if (dynamicTag) {
            resolvedTags.push(dynamicTag);
          }
        } catch (error) {
          console.error(`❌ Cache: Error resolving dynamic tag:`, error);
        }
      }
    }
    
    resolved.tags = resolvedTags;
  }
  
  return resolved;
}

/**
 * Cache invalidation middleware for non-GET requests
 */
export const invalidateCache = (tags: string[], keyPrefix?: string) => {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    // Continue to route handler first
    next();

    // After response is sent, invalidate cache
    res.on('finish', async () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          await cacheService.invalidateByTags(tags, keyPrefix);
          console.log(`🔄 Cache invalidated tags: [${tags.join(', ')}]`);
        } catch (error) {
          console.error('❌ Cache: Failed to invalidate tags:', error);
        }
      }
    });
  });
};

/**
 * Smart cache invalidation based on route patterns and actions
 */
export const smartInvalidate = (options: {
  entityType: string; // e.g., 'property', 'user', 'metrics'
  action?: 'create' | 'update' | 'delete'; // If not provided, infers from method
  entityId?: string | ((req: Request) => string); // Entity ID for specific invalidation
  additionalTags?: string[]; // Additional tags to invalidate
  keyPrefix?: string;
}) => {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    // Continue to route handler first
    next();

    // After response is sent, intelligently invalidate cache
    res.on('finish', async () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const action = options.action || inferActionFromMethod(req.method);
        const tags = generateInvalidationTags(options, req, action);

        if (tags.length > 0) {
          try {
            await cacheService.invalidateByTags(tags, options.keyPrefix);
            console.log(`🧠 Smart invalidation (${action}): [${tags.join(', ')}]`);
          } catch (error) {
            console.error('❌ Cache: Failed smart invalidation:', error);
          }
        }
      }
    });
  });
};

/**
 * Generate invalidation tags based on entity and action
 */
function generateInvalidationTags(
  options: { entityType: string; entityId?: string | ((req: Request) => string); additionalTags?: string[] }, 
  req: Request, 
  action: string
): string[] {
  const tags: string[] = [];
  const { entityType, entityId, additionalTags } = options;

  // Always invalidate entity list
  tags.push(`${entityType}:list`);

  // Add action-specific tags
  switch (action) {
    case 'create':
      tags.push(`${entityType}:list`);
      tags.push(`${entityType}:featured`);
      break;
    
    case 'update':
      tags.push(`${entityType}:list`);
      tags.push(`${entityType}:featured`);
      
      // Invalidate specific entity if ID provided
      if (entityId) {
        const id = typeof entityId === 'function' ? entityId(req) : entityId;
        if (id) {
          tags.push(`${entityType}:${id}`);
        }
      }
      break;
    
    case 'delete':
      tags.push(`${entityType}:list`);
      tags.push(`${entityType}:featured`);
      
      // Invalidate specific entity if ID provided
      if (entityId) {
        const id = typeof entityId === 'function' ? entityId(req) : entityId;
        if (id) {
          tags.push(`${entityType}:${id}`);
        }
      }
      break;
  }

  // Add additional tags
  if (additionalTags) {
    tags.push(...additionalTags);
  }

  // Remove duplicates
  return Array.from(new Set(tags));
}

/**
 * Infer action from HTTP method
 */
function inferActionFromMethod(method: string): string {
  switch (method.toUpperCase()) {
    case 'POST':
      return 'create';
    case 'PUT':
    case 'PATCH':
      return 'update';
    case 'DELETE':
      return 'delete';
    default:
      return 'read';
  }
}

/**
 * Predefined cache configurations for common scenarios
 */
export const cachePresets = {
  // Short cache for frequently changing data (2 minutes)
  short: { ttl: 120 },
  
  // Medium cache for semi-static data (5 minutes)
  medium: { ttl: 300 },
  
  // Long cache for static data (30 minutes)
  long: { ttl: 1800 },
  
  // Property list cache (5 minutes, varies by query params)
  propertyList: { 
    ttl: 300, 
    tags: ['property:list'],
    varyBy: ['query.page', 'query.limit', 'query.status', 'query.type', 'query.location']
  },
  
  // Individual property cache (10 minutes)
  property: { 
    ttl: 600, 
    tags: ['property:detail'],
    varyBy: ['user.id'] // Cache varies by user for favorites status
  },
  
  // Featured properties cache (10 minutes)
  featuredProperties: { 
    ttl: 600, 
    tags: ['property:featured'] 
  },
  
  // User-specific data cache (5 minutes)
  userSpecific: { 
    ttl: 300,
    varyBy: ['user.id'],
    condition: (req: Request) => !!(req as any).user?.id
  },
  
  // Metrics cache (2 minutes)
  metrics: { 
    ttl: 120, 
    tags: ['metrics'],
    varyBy: ['user.id']
  },
  
  // Config cache (30 minutes)
  config: { 
    ttl: 1800, 
    tags: ['config'] 
  }
};

/**
 * Cache health check endpoint
 */
export const cacheHealthCheck = asyncHandler(async (req: Request, res: Response) => {
  const health = await cacheService.healthCheck();
  const stats = cacheService.getStats();
  
  res.status(health.status === 'healthy' ? 200 : 503).json({
    cache: health,
    stats: {
      ...stats,
      hitRate: stats.operations > 0 ? (stats.hits / stats.operations * 100).toFixed(2) + '%' : '0%'
    }
  });
});

/**
 * Reset cache stats endpoint (for debugging)
 */
export const resetCacheStats = asyncHandler(async (req: Request, res: Response) => {
  cacheService.resetStats();
  res.json({ message: 'Cache stats reset successfully' });
});