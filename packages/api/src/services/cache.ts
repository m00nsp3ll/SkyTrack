import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Create Redis client with fallback for when Redis is not available
let redis: Redis | null = null;
let redisAvailable = false;

try {
  redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    enableReadyCheck: true,
    lazyConnect: true,
  });

  redis.on('connect', () => {
    console.log('🔴 Redis connected');
    redisAvailable = true;
  });

  redis.on('error', (err) => {
    console.warn('⚠️ Redis connection error (cache disabled):', err.message);
    redisAvailable = false;
  });

  redis.on('close', () => {
    redisAvailable = false;
  });

  // Try to connect
  redis.connect().catch(() => {
    console.warn('⚠️ Redis not available, running without cache');
  });
} catch (error) {
  console.warn('⚠️ Redis initialization failed, running without cache');
}

// Cache key prefixes
const CACHE_KEYS = {
  PILOT_QUEUE: 'skytrack:pilot_queue',
  ACTIVE_FLIGHTS: 'skytrack:active_flights',
  PRODUCTS: 'skytrack:products',
  PILOT: 'skytrack:pilot:',
  CUSTOMER: 'skytrack:customer:',
};

// Default TTL values (in seconds)
const TTL = {
  PILOT_QUEUE: 30,      // 30 seconds - frequently updated
  ACTIVE_FLIGHTS: 10,   // 10 seconds - real-time data
  PRODUCTS: 300,        // 5 minutes - rarely changes
  PILOT: 60,            // 1 minute
  CUSTOMER: 60,         // 1 minute
};

export const cache = {
  // Check if Redis is available
  isAvailable: () => redisAvailable && redis !== null,

  // Generic get/set operations
  async get<T>(key: string): Promise<T | null> {
    if (!redisAvailable || !redis) return null;
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  },

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    if (!redisAvailable || !redis) return;
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await redis.setex(key, ttlSeconds, serialized);
      } else {
        await redis.set(key, serialized);
      }
    } catch (error) {
      console.error('Cache set error:', error);
    }
  },

  async del(key: string): Promise<void> {
    if (!redisAvailable || !redis) return;
    try {
      await redis.del(key);
    } catch (error) {
      console.error('Cache del error:', error);
    }
  },

  async delPattern(pattern: string): Promise<void> {
    if (!redisAvailable || !redis) return;
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.error('Cache delPattern error:', error);
    }
  },

  // Specific cache operations
  pilotQueue: {
    async get() {
      return cache.get(CACHE_KEYS.PILOT_QUEUE);
    },
    async set(data: any) {
      return cache.set(CACHE_KEYS.PILOT_QUEUE, data, TTL.PILOT_QUEUE);
    },
    async invalidate() {
      return cache.del(CACHE_KEYS.PILOT_QUEUE);
    },
  },

  activeFlights: {
    async get() {
      return cache.get(CACHE_KEYS.ACTIVE_FLIGHTS);
    },
    async set(data: any) {
      return cache.set(CACHE_KEYS.ACTIVE_FLIGHTS, data, TTL.ACTIVE_FLIGHTS);
    },
    async invalidate() {
      return cache.del(CACHE_KEYS.ACTIVE_FLIGHTS);
    },
  },

  products: {
    async get() {
      return cache.get(CACHE_KEYS.PRODUCTS);
    },
    async set(data: any) {
      return cache.set(CACHE_KEYS.PRODUCTS, data, TTL.PRODUCTS);
    },
    async invalidate() {
      return cache.del(CACHE_KEYS.PRODUCTS);
    },
  },

  pilot: {
    async get(pilotId: string) {
      return cache.get(`${CACHE_KEYS.PILOT}${pilotId}`);
    },
    async set(pilotId: string, data: any) {
      return cache.set(`${CACHE_KEYS.PILOT}${pilotId}`, data, TTL.PILOT);
    },
    async invalidate(pilotId: string) {
      return cache.del(`${CACHE_KEYS.PILOT}${pilotId}`);
    },
    async invalidateAll() {
      return cache.delPattern(`${CACHE_KEYS.PILOT}*`);
    },
  },

  customer: {
    async get(customerId: string) {
      return cache.get(`${CACHE_KEYS.CUSTOMER}${customerId}`);
    },
    async set(customerId: string, data: any) {
      return cache.set(`${CACHE_KEYS.CUSTOMER}${customerId}`, data, TTL.CUSTOMER);
    },
    async invalidate(customerId: string) {
      return cache.del(`${CACHE_KEYS.CUSTOMER}${customerId}`);
    },
  },

  // Invalidate all caches (useful for daily reset)
  async invalidateAll() {
    if (!redisAvailable || !redis) return;
    try {
      const keys = await redis.keys('skytrack:*');
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      console.log('✅ All caches invalidated');
    } catch (error) {
      console.error('Cache invalidateAll error:', error);
    }
  },
};

export default cache;
