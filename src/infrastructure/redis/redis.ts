import Redis from 'ioredis';

// Single shared ioredis connection (survives Next.js dev hot-reloads).
const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export const redis =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    // Fail fast instead of buffering commands forever if Redis is down.
    maxRetriesPerRequest: 2,
    lazyConnect: false,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
}

export default redis;
