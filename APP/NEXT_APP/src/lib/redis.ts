/**
 * Redis Client for Portfolio Application
 * 
 * Used for:
 * - Exchange rate caching (Frankfurter API)
 * - Session management
 * - Rate limiting
 * - Finance module caching
 * 
 * Connection: redis://:{REDIS_PASSWORD}@redis:6379
 * Memory limit: 128MB with LRU eviction
 */

import { createClient, RedisClientType } from 'redis';

// Singleton Redis client
let redisClient: RedisClientType | null = null;
let isConnecting = false;
let connectionPromise: Promise<RedisClientType> | null = null;

/**
 * Get or create Redis client connection
 * Uses singleton pattern with connection pooling
 */
export async function getRedisClient(): Promise<RedisClientType> {
    // Return existing connected client
    if (redisClient?.isOpen) {
        return redisClient;
    }

    // Wait for existing connection attempt
    if (isConnecting && connectionPromise) {
        return connectionPromise;
    }

    // Check if Redis URL is configured
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
        throw new Error('REDIS_URL environment variable is not configured');
    }

    isConnecting = true;

    connectionPromise = (async () => {
        try {
            redisClient = createClient({
                url: redisUrl,
                socket: {
                    connectTimeout: 5000,
                    reconnectStrategy: (retries) => {
                        // Exponential backoff with max 30 seconds
                        if (retries > 10) {
                            console.error('[Redis] Max reconnection attempts reached');
                            return new Error('Redis max retries exceeded');
                        }
                        return Math.min(retries * 500, 30000);
                    },
                },
            });

            // Error handling
            redisClient.on('error', (err) => {
                console.error('[Redis] Client error:', err.message);
            });

            redisClient.on('connect', () => {
                console.log('[Redis] Connected successfully');
            });

            redisClient.on('reconnecting', () => {
                console.log('[Redis] Reconnecting...');
            });

            await redisClient.connect();
            return redisClient;
        } catch (error) {
            console.error('[Redis] Connection failed:', error);
            redisClient = null;
            throw error;
        } finally {
            isConnecting = false;
            connectionPromise = null;
        }
    })();

    return connectionPromise;
}

/**
 * Check if Redis is available
 * Returns false if not configured or connection fails
 */
export async function isRedisAvailable(): Promise<boolean> {
    if (!process.env.REDIS_URL) {
        return false;
    }

    try {
        const client = await getRedisClient();
        await client.ping();
        return true;
    } catch {
        return false;
    }
}

/**
 * Gracefully close Redis connection
 * Call this on application shutdown
 */
export async function closeRedisConnection(): Promise<void> {
    if (redisClient?.isOpen) {
        await redisClient.quit();
        redisClient = null;
        console.log('[Redis] Connection closed');
    }
}

// ============= CACHE UTILITIES =============

/**
 * Cache key prefixes for organization
 */
export const CACHE_KEYS = {
    EXCHANGE_RATE: 'finance:exchange_rate',
    USER_PERMISSIONS: 'user:permissions',
    FINANCE_SUMMARY: 'finance:summary',
    RATE_LIMIT: 'ratelimit',
} as const;

/**
 * Default TTL values (in seconds)
 */
export const CACHE_TTL = {
    EXCHANGE_RATE: 4 * 60 * 60,      // 4 hours (Frankfurter updates daily)
    USER_PERMISSIONS: 60,             // 1 minute
    FINANCE_SUMMARY: 5 * 60,          // 5 minutes
    RATE_LIMIT_WINDOW: 60,            // 1 minute
} as const;

/**
 * Get cached value with automatic JSON parsing
 */
export async function getCached<T>(key: string): Promise<T | null> {
    try {
        const client = await getRedisClient();
        const value = await client.get(key);

        if (!value) return null;

        return JSON.parse(value) as T;
    } catch (error) {
        console.error(`[Redis] Get cache error for key ${key}:`, error);
        return null;
    }
}

/**
 * Set cached value with automatic JSON serialization
 */
export async function setCached<T>(
    key: string,
    value: T,
    ttlSeconds: number = CACHE_TTL.EXCHANGE_RATE
): Promise<boolean> {
    try {
        const client = await getRedisClient();
        await client.setEx(key, ttlSeconds, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error(`[Redis] Set cache error for key ${key}:`, error);
        return false;
    }
}

/**
 * Delete cached value
 */
export async function deleteCached(key: string): Promise<boolean> {
    try {
        const client = await getRedisClient();
        await client.del(key);
        return true;
    } catch (error) {
        console.error(`[Redis] Delete cache error for key ${key}:`, error);
        return false;
    }
}

/**
 * Delete multiple cached values by pattern
 */
/**
 * Delete multiple cached values by pattern using SCAN (non-blocking)
 */
export async function deleteCachedByPattern(pattern: string): Promise<number> {
    try {
        const client = await getRedisClient();
        let cursor = 0;
        let deletedCount = 0;

        do {
            // Scan for keys matching pattern
            const result = await client.scan(cursor, {
                MATCH: pattern,
                COUNT: 100
            });

            cursor = result.cursor;
            const keys = result.keys;

            if (keys.length > 0) {
                const count = await client.del(keys);
                deletedCount += count;
            }

        } while (cursor !== 0);

        return deletedCount;
    } catch (error) {
        console.error(`[Redis] Delete by pattern error for ${pattern}:`, error);
        return 0;
    }
}

// ============= RATE LIMITING =============

interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetIn: number; // seconds until reset
}

/**
 * Check and increment rate limit counter
 * Uses sliding window algorithm
 */
export async function checkRateLimit(
    identifier: string,
    limit: number,
    windowSeconds: number = CACHE_TTL.RATE_LIMIT_WINDOW
): Promise<RateLimitResult> {
    try {
        const client = await getRedisClient();
        const key = `${CACHE_KEYS.RATE_LIMIT}:${identifier}`;

        // Increment counter
        const count = await client.incr(key);

        // Set TTL on first request
        if (count === 1) {
            await client.expire(key, windowSeconds);
        }

        // Get remaining TTL
        const ttl = await client.ttl(key);

        return {
            allowed: count <= limit,
            remaining: Math.max(0, limit - count),
            resetIn: ttl > 0 ? ttl : windowSeconds,
        };
    } catch (error) {
        console.error('[Redis] Rate limit check error:', error);
        // Fail open - allow request if Redis is down
        return { allowed: true, remaining: limit, resetIn: windowSeconds };
    }
}

/**
 * Reset rate limit for an identifier
 */
export async function resetRateLimit(identifier: string): Promise<boolean> {
    return deleteCached(`${CACHE_KEYS.RATE_LIMIT}:${identifier}`);
}
