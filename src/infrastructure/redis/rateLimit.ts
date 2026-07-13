import redis from './redis';

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

/**
 * Fixed-window rate limiter backed by Redis.
 *
 * Uses an atomic INCR; on the first hit in a window we set the TTL. This is
 * O(1), race-safe across processes, and requires no Lua. Good enough for
 * protecting hot endpoints (booking, auth) against abuse/bursts.
 *
 * @param key         unique bucket key (e.g. `booking:<userId>` or `ip:<ip>`)
 * @param limit       max requests allowed per window
 * @param windowSecs  window size in seconds
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSecs: number
): Promise<RateLimitResult> {
  const redisKey = `ratelimit:${key}`;

  const count = await redis.incr(redisKey);
  if (count === 1) {
    // First request in this window — start the expiry clock.
    await redis.expire(redisKey, windowSecs);
  }

  let ttl = await redis.ttl(redisKey);
  // ttl can be -1 (no expire set due to a race) — repair it defensively.
  if (ttl < 0) {
    await redis.expire(redisKey, windowSecs);
    ttl = windowSecs;
  }

  const remaining = Math.max(0, limit - count);

  return {
    success: count <= limit,
    limit,
    remaining,
    resetSeconds: ttl,
  };
}

/** Cache-aside helper: return cached JSON or compute, store, and return it. */
export async function cached<T>(
  key: string,
  ttlSecs: number,
  compute: () => Promise<T>
): Promise<T> {
  const cacheKey = `cache:${key}`;
  const hit = await redis.get(cacheKey);
  if (hit) {
    return JSON.parse(hit) as T;
  }

  const value = await compute();
  await redis.set(cacheKey, JSON.stringify(value), 'EX', ttlSecs);
  return value;
}

/** Invalidate a cache-aside entry (call after writes). */
export async function invalidateCache(key: string): Promise<void> {
  await redis.del(`cache:${key}`);
}
