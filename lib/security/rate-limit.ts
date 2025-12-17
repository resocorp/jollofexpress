// Rate Limiting with Redis Support
// For production deployments with multiple instances

/**
 * Rate Limiter Interface
 */
export interface RateLimiter {
  check(key: string): Promise<{ allowed: boolean; remaining: number; resetTime: number }>;
  reset(key: string): Promise<void>;
}

/**
 * In-Memory Rate Limiter (for development/single instance)
 * WARNING: Does not work across multiple server instances
 */
export class MemoryRateLimiter implements RateLimiter {
  private store = new Map<string, { count: number; resetTime: number }>();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;

    // Clean up old entries periodically
    setInterval(() => this.cleanup(), windowMs);
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, value] of this.store.entries()) {
      if (now > value.resetTime) {
        this.store.delete(key);
      }
    }
  }

  async check(key: string): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now();
    const record = this.store.get(key);

    if (!record || now > record.resetTime) {
      const resetTime = now + this.windowMs;
      this.store.set(key, { count: 1, resetTime });
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetTime,
      };
    }

    if (record.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: record.resetTime,
      };
    }

    record.count++;
    return {
      allowed: true,
      remaining: this.maxRequests - record.count,
      resetTime: record.resetTime,
    };
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }
}

/**
 * Redis Rate Limiter (for production with multiple instances)
 * Requires Redis connection
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RedisClient = any; // Redis client type

export class RedisRateLimiter implements RateLimiter {
  private redis: RedisClient;
  private maxRequests: number;
  private windowMs: number;

  constructor(redis: RedisClient, maxRequests: number = 100, windowMs: number = 60000) {
    this.redis = redis;
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async check(key: string): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now();
    const resetTime = now + this.windowMs;

    try {
      // Use Redis INCR for atomic counter increment
      const count = await this.redis.incr(key);

      // Set expiry on first request
      if (count === 1) {
        await this.redis.pexpire(key, this.windowMs);
      }

      const remaining = Math.max(0, this.maxRequests - count);
      const allowed = count <= this.maxRequests;

      return {
        allowed,
        remaining,
        resetTime,
      };
    } catch (error) {
      console.error('[RateLimit] Redis error:', error);
      // Fail open - allow request if Redis is down
      return {
        allowed: true,
        remaining: this.maxRequests,
        resetTime,
      };
    }
  }

  async reset(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error('[RateLimit] Redis delete error:', error);
    }
  }
}

/**
 * Factory function to create rate limiter based on environment
 */
export function createRateLimiter(
  maxRequests: number = 100,
  windowMs: number = 60000
): RateLimiter {
  // Check if Redis is configured
  const redisUrl = process.env.REDIS_URL;

  if (redisUrl && process.env.NODE_ENV === 'production') {
    try {
      // Dynamically import Redis (optional dependency)
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Redis = require('ioredis');
      const redis = new Redis(redisUrl);

      console.log('[RateLimit] Using Redis rate limiter');
      return new RedisRateLimiter(redis, maxRequests, windowMs);
    } catch (error) {
      console.warn('[RateLimit] Redis not available, falling back to memory:', error);
    }
  }

  console.log('[RateLimit] Using in-memory rate limiter (not recommended for production)');
  return new MemoryRateLimiter(maxRequests, windowMs);
}

/**
 * Rate limit configurations for different endpoints
 */
export const RATE_LIMITS = {
  // General API endpoints
  general: { maxRequests: 100, windowMs: 60000 }, // 100 req/min

  // Order creation (more restrictive)
  orderCreation: { maxRequests: 5, windowMs: 60000 }, // 5 req/min

  // Admin endpoints
  admin: { maxRequests: 200, windowMs: 60000 }, // 200 req/min

  // Auth endpoints (very restrictive)
  auth: { maxRequests: 5, windowMs: 900000 }, // 5 req/15min

  // Payment webhooks
  webhook: { maxRequests: 1000, windowMs: 60000 }, // 1000 req/min
};
